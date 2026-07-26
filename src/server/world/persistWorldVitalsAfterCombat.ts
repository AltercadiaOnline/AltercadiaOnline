/**
 * Persiste HP pós-batalha e notifica o cliente pelo canal econômico canônico
 * (`WorldVitalsUpdated` → EconomyEventForwarder / espelho local).
 */

import type { Combatant } from '../../shared/types.js';
import type { PlayerWorldVitals } from '../../shared/character/equipmentState.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import { clampPlayerHpCurrent, computePlayerHpMax, resolveDefeatRespawnHpCurrent } from '../../shared/character/playerVitals.js';
import { resolveCombatantHp } from '../../shared/pet/petCombatRules.js';
import { EconomyEventType } from '../../shared/economy/events.js';
import { globalEventBus } from '../../Economy/EventBus.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { touchCharacterPersistenceDirty } from '../persistence/PersistenceGateway.js';
import { getWorldProfile, saveWorldProfile } from './worldProfileStore.js';

function mpVitalsForLevel(level: number): { readonly mpCurrent: number; readonly mpMax: number } {
  const mpMax = 40 + level * 8;
  return { mpCurrent: mpMax, mpMax };
}

/** Reposiciona o jogador (ex.: respawn na cidade após derrota). */
export type PostCombatRespawn = {
  readonly mapId: string;
  readonly x: number;
  readonly y: number;
  readonly facing: PlayerFacing;
};

export type PersistWorldVitalsOptions = {
  /** Vitória / cura total — preenche HP e MP. */
  readonly fullRestore?: boolean;
  /** Derrota PVE — respawn na cidade com HP baixo (~10% do máximo). */
  readonly defeatRespawn?: boolean;
  /** Derrota → reposiciona o perfil de mundo (centro da cidade). */
  readonly respawn?: PostCombatRespawn;
};

/** Persiste vitals de mundo pós-combate e emite `WorldVitalsUpdated`. */
export function persistWorldVitalsAfterCombat(
  playerId: string,
  characterId: number,
  playerCombatant: Combatant,
  options?: PersistWorldVitalsOptions,
): PlayerWorldVitals {
  const profile = getWorldProfile(playerId, characterId);
  const existing = profile.sessionSync?.worldVitals;
  const level = getAuthoritativeProgression(playerId, characterId).characterProfile.level ?? 1;
  const defaultMp = mpVitalsForLevel(level);

  const hpMax = Math.max(
    1,
    Math.floor(playerCombatant.hpMax ?? playerCombatant.maxHp ?? computePlayerHpMax(level)),
  );
  const hpCurrent = options?.fullRestore
    ? hpMax
    : options?.defeatRespawn
      ? resolveDefeatRespawnHpCurrent(hpMax)
      : clampPlayerHpCurrent(resolveCombatantHp(playerCombatant), hpMax);
  const mpMax = existing?.mpMax ?? defaultMp.mpMax;
  const mpCurrent = options?.fullRestore
    ? mpMax
    : Math.max(0, Math.min(mpMax, Math.floor(existing?.mpCurrent ?? defaultMp.mpCurrent)));

  const vitals: PlayerWorldVitals = {
    hpCurrent,
    hpMax,
    mpCurrent,
    mpMax,
  };

  const respawn = options?.respawn;
  saveWorldProfile(playerId, characterId, {
    ...profile,
    ...(respawn
      ? {
          currentMapId: respawn.mapId,
          lastPosition: { x: respawn.x, y: respawn.y },
          facing: respawn.facing,
        }
      : {}),
    sessionSync: {
      ...profile.sessionSync,
      worldVitals: vitals,
    },
  });
  touchCharacterPersistenceDirty(playerId, characterId, 'combat');

  // Mesmo evento do HEAL_AT_NPC — forwarder agenda persist + espelho no cliente.
  globalEventBus.emit({
    type: EconomyEventType.WorldVitalsUpdated,
    payload: {
      playerId,
      characterId,
      vitals,
      message: '',
      revision: Date.now(),
    },
  });

  return vitals;
}
