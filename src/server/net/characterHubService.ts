import {
  CHARACTER_SLOT_COUNT,
  createEmptyCharacterHub,
  type AccountCharacterHub,
} from '../../shared/characterHub.js';
import type { AccountCharacter } from '../../shared/types/account.js';
import { validateCreateCharacterInput } from '../../shared/characterCreation.js';
import { createDefaultPlayerSkin } from '../../shared/character/playerSkin.js';
import { resolvePlayerSkinBundleId } from '../../shared/character/playerSkinBundle.js';
import type { ProfileRow } from '../../shared/supabase/gameDatabaseTypes.js';
import type { ClassType } from '../../shared/types/classes.js';
import {
  ensureMovesetMasteryForClass,
} from '../../shared/progression/movesetMasterySeed.js';
import { createDefaultPlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { getSupabaseAdminClient } from '../supabase/supabaseAdmin.js';
import { ensureServerPlayerBootstrap } from '../supabase/bootstrapPlayerOnServer.js';
import {
  allocateNextCharacterId,
  insertProfileForCharacter,
  listProfilesForUserOnServer,
  slotOccupiedOnServer,
  deleteCharacterOnServer,
  resolveAccountEmail,
} from '../supabase/characterHubRepository.js';
import { upsertPlayerCurrency, upsertPlayerInventory } from '../supabase/playerGameDataRepository.js';
import { hydrateCharacterSession, persistCharacterSession } from '../persistence/PersistenceGateway.js';
import {
  getAuthoritativeProgression,
  loadAuthoritativeProgression,
  patchAuthoritativeProgression,
} from '../progression/authoritativeProgressionStore.js';
import { reconcileAuthoritativeCharacterClassLink } from '../progression/reconcileCharacterClassLink.js';
import type { ServerEnv } from '../config/env.js';
import {
  purgeCharacterRuntimeState,
  resetNewCharacterEconomy,
} from './purgeCharacterRuntimeState.js';

function resolveSlotIndex(profile: ProfileRow): number | null {
  const fromColumn = profile.slot_index;
  if (typeof fromColumn === 'number' && Number.isInteger(fromColumn)
    && fromColumn >= 0 && fromColumn < CHARACTER_SLOT_COUNT) {
    return fromColumn;
  }
  // Compat transitória pré-migration 012 (character_id 1..5).
  const legacy = profile.character_id - 1;
  if (legacy >= 0 && legacy < CHARACTER_SLOT_COUNT) return legacy;
  return null;
}

function mapProfileToCharacter(
  playerId: string,
  profile: ProfileRow,
  slotIndex: number,
): AccountCharacter {
  const classId = reconcileAuthoritativeCharacterClassLink(playerId, profile.character_id);
  const progression = getAuthoritativeProgression(playerId, profile.character_id);
  const displayName = profile.display_name?.trim()
    || progression.characterProfile.displayName?.trim()
    || 'Operador';

  return {
    id: profile.character_id,
    name: displayName,
    class: classId,
    level: progression.characterProfile.level ?? profile.level ?? 1,
    slotIndex,
    serverId: profile.server_id,
    skin: createDefaultPlayerSkin(),
    skinBundleId: resolvePlayerSkinBundleId({
      skinBundleId: progression.characterProfile.skinBundleId ?? null,
    }),
  };
}

export async function buildAuthoritativeCharacterHub(
  playerId: string,
  env: ServerEnv,
): Promise<AccountCharacterHub> {
  const client = await getSupabaseAdminClient(env);
  const instance = getServerInstanceContext();
  const profiles = await listProfilesForUserOnServer(client, playerId, instance.id);

  if (profiles.length === 0) {
    return createEmptyCharacterHub(playerId);
  }

  const slots: AccountCharacterHub['slots'][number][] = Array.from(
    { length: CHARACTER_SLOT_COUNT },
    () => null,
  );

  for (const profile of profiles) {
    const slotIndex = resolveSlotIndex(profile);
    if (slotIndex === null) continue;

    await hydrateCharacterSession(playerId, profile.character_id);
    slots[slotIndex] = mapProfileToCharacter(playerId, profile, slotIndex);
  }

  return { userId: playerId, slots };
}

function seedClassProgression(
  playerId: string,
  characterId: number,
  classId: ClassType,
  displayName: string,
): void {
  const baseProgression = createDefaultPlayerProgressionData();
  const movesetMastery = ensureMovesetMasteryForClass(baseProgression.movesetMastery, classId);

  loadAuthoritativeProgression(playerId, characterId, {
    progression: {
      ...baseProgression,
      movesetMastery,
    },
    marcos: {
      activeMarcos: [],
      flowSpeedBase: 1,
      nodeProgression: emptyMarcosNodeProgression(),
    },
    characterProfile: {
      level: 1,
      xpCurrent: 0,
      displayName,
      classId,
    },
  });
}

export async function createAuthoritativeCharacterInSlot(
  playerId: string,
  env: ServerEnv,
  input: {
    readonly slotIndex: number;
    readonly name: string;
    readonly class: ClassType;
    readonly skinBundleId?: string;
  },
): Promise<{ readonly ok: true; readonly hub: AccountCharacterHub } | { readonly ok: false; readonly message: string }> {
  const validation = validateCreateCharacterInput(input);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const client = await getSupabaseAdminClient(env);
  const instance = getServerInstanceContext();
  const slotIndex = validation.slotIndex;

  // Slot é por shard — não bloquear por character_id noutro servidor.
  if (await slotOccupiedOnServer(client, playerId, slotIndex, instance.id)) {
    return { ok: false, message: 'Este slot já possui um personagem.' };
  }

  const hub = await buildAuthoritativeCharacterHub(playerId, env);
  const existingNames = hub.slots
    .filter((slot): slot is AccountCharacter => slot !== null)
    .map((character) => character.name.toLowerCase());
  if (existingNames.includes(validation.name.toLowerCase())) {
    return { ok: false, message: 'Já existe um personagem com este nome nesta conta.' };
  }

  const characterId = await allocateNextCharacterId(client, playerId, instance.id);
  const email = await resolveAccountEmail(client, playerId, instance.id);
  await insertProfileForCharacter(
    client,
    playerId,
    characterId,
    slotIndex,
    validation.name,
    email,
    instance.id,
  );

  // Trigger bootstrap: força inventário + carteira vazios no Supabase (por personagem).
  const emptyInventory = await upsertPlayerInventory(
    client,
    playerId,
    characterId,
    instance.id,
    [],
    {},
  );
  if (!emptyInventory.ok) {
    return {
      ok: false,
      message: emptyInventory.message ?? 'Falha ao inicializar inventário do personagem.',
    };
  }

  const emptyWallet = await upsertPlayerCurrency(
    client,
    playerId,
    characterId,
    instance.id,
    0,
    0,
  );
  if (!emptyWallet.ok) {
    return {
      ok: false,
      message: emptyWallet.message ?? 'Falha ao inicializar carteira do personagem.',
    };
  }

  resetNewCharacterEconomy(playerId, characterId);

  const bootstrap = await ensureServerPlayerBootstrap(playerId, characterId);
  if (!bootstrap.profileReady) {
    return { ok: false, message: 'Personagem criado, mas o servidor ainda está provisionando. Tente novamente.' };
  }

  seedClassProgression(playerId, characterId, validation.class, validation.name);
  patchAuthoritativeProgression(playerId, characterId, {
    characterProfile: {
      displayName: validation.name,
      skinBundleId: validation.skinBundleId,
      classId: validation.class,
    },
  });

  await persistCharacterSession(playerId, characterId, {
    force: true,
    reason: 'login',
  }).catch((error) => {
    console.warn('[characterHub] persist after create failed:', error);
  });

  const updatedHub = await buildAuthoritativeCharacterHub(playerId, env);
  return { ok: true, hub: updatedHub };
}

export async function deleteAuthoritativeCharacter(
  playerId: string,
  env: ServerEnv,
  characterId: number,
): Promise<{ readonly ok: true; readonly hub: AccountCharacterHub } | { readonly ok: false; readonly message: string }> {
  if (!Number.isInteger(characterId) || characterId < 1) {
    return { ok: false, message: 'Personagem inválido.' };
  }

  const client = await getSupabaseAdminClient(env);
  const instance = getServerInstanceContext();

  const deleted = await deleteCharacterOnServer(
    client,
    playerId,
    characterId,
    instance.id,
  );

  if (!deleted) {
    return { ok: false, message: 'Personagem não encontrado neste servidor.' };
  }

  purgeCharacterRuntimeState(playerId, characterId);

  const updatedHub = await buildAuthoritativeCharacterHub(playerId, env);
  return { ok: true, hub: updatedHub };
}
