import {
  CHARACTER_SLOT_COUNT,
  createEmptyCharacterHub,
  type AccountCharacterHub,
} from '../../shared/characterHub.js';
import type { AccountCharacter } from '../../shared/types/account.js';
import { validateCreateCharacterInput } from '../../shared/characterCreation.js';
import { createDefaultPlayerSkin } from '../../shared/character/playerSkin.js';
import type { ProfileRow } from '../../shared/supabase/gameDatabaseTypes.js';
import type { ClassType } from '../../shared/types/classes.js';
import {
  ensureMovesetMasteryForClass,
  inferClassIdFromMovesetMastery,
} from '../../shared/progression/movesetMasterySeed.js';
import { createDefaultPlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { getSupabaseAdminClient } from '../supabase/supabaseAdmin.js';
import { ensureServerPlayerBootstrap } from '../supabase/bootstrapPlayerOnServer.js';
import {
  insertProfileForCharacter,
  listProfilesForUserOnServer,
  profileExistsOnOtherServer,
  profileExistsOnServer,
  resolveAccountEmail,
} from '../supabase/characterHubRepository.js';
import { hydrateCharacterSession } from '../persistence/PersistenceGateway.js';
import {
  getAuthoritativeProgression,
  loadAuthoritativeProgression,
  patchAuthoritativeProgression,
} from '../progression/authoritativeProgressionStore.js';
import type { ServerEnv } from '../config/env.js';

function slotIndexForCharacterId(characterId: number): number | null {
  const slotIndex = characterId - 1;
  if (slotIndex < 0 || slotIndex >= CHARACTER_SLOT_COUNT) return null;
  return slotIndex;
}

function resolveCharacterClass(playerId: string, characterId: number): ClassType {
  const progression = getAuthoritativeProgression(playerId, characterId);
  return inferClassIdFromMovesetMastery(progression.progression.movesetMastery) ?? 'IMPETUS';
}

function mapProfileToCharacter(
  playerId: string,
  profile: ProfileRow,
  slotIndex: number,
): AccountCharacter {
  const progression = getAuthoritativeProgression(playerId, profile.character_id);
  const displayName = profile.display_name?.trim()
    || progression.characterProfile.displayName?.trim()
    || 'Operador';

  return {
    id: profile.character_id,
    name: displayName,
    class: resolveCharacterClass(playerId, profile.character_id),
    level: progression.characterProfile.level ?? 1,
    slotIndex,
    serverId: profile.server_id,
    skin: createDefaultPlayerSkin(),
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
    const slotIndex = slotIndexForCharacterId(profile.character_id);
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
    },
  });
}

export async function createAuthoritativeCharacterInSlot(
  playerId: string,
  env: ServerEnv,
  input: { readonly slotIndex: number; readonly name: string; readonly class: ClassType },
): Promise<{ readonly ok: true; readonly hub: AccountCharacterHub } | { readonly ok: false; readonly message: string }> {
  const validation = validateCreateCharacterInput(input);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const characterId = validation.slotIndex + 1;
  const client = await getSupabaseAdminClient(env);
  const instance = getServerInstanceContext();

  if (await profileExistsOnServer(client, playerId, characterId, instance.id)) {
    return { ok: false, message: 'Este slot já possui um personagem.' };
  }

  if (await profileExistsOnOtherServer(client, playerId, characterId, instance.id)) {
    return {
      ok: false,
      message: 'Este slot já está vinculado a outro servidor. Criação bloqueada.',
    };
  }

  const hub = await buildAuthoritativeCharacterHub(playerId, env);
  const existingNames = hub.slots
    .filter((slot): slot is AccountCharacter => slot !== null)
    .map((character) => character.name.toLowerCase());
  if (existingNames.includes(validation.name.toLowerCase())) {
    return { ok: false, message: 'Já existe um personagem com este nome nesta conta.' };
  }

  const email = await resolveAccountEmail(client, playerId, instance.id);
  await insertProfileForCharacter(
    client,
    playerId,
    characterId,
    validation.name,
    email,
    instance.id,
  );

  const bootstrap = await ensureServerPlayerBootstrap(playerId, characterId);
  if (!bootstrap.profileReady) {
    return { ok: false, message: 'Personagem criado, mas o servidor ainda está provisionando. Tente novamente.' };
  }

  seedClassProgression(playerId, characterId, validation.class, validation.name);
  patchAuthoritativeProgression(playerId, characterId, {
    characterProfile: { displayName: validation.name },
  });

  const updatedHub = await buildAuthoritativeCharacterHub(playerId, env);
  return { ok: true, hub: updatedHub };
}
