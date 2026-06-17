import type { Combatant } from '../../shared/types.js';
import { clampPlayerHpCurrent, computePlayerHpMax } from '../../shared/character/playerVitals.js';
import { resolveCombatantHp } from '../../shared/pet/petCombatRules.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { getWorldProfile, saveWorldProfile } from './worldProfileStore.js';

function mpVitalsForLevel(level: number): { readonly mpCurrent: number; readonly mpMax: number } {
  const mpMax = 40 + level * 8;
  return { mpCurrent: mpMax, mpMax };
}

/** Persiste HP pós-batalha no perfil de mundo — fonte para HEAL_AT_NPC e próximo combate. */
export function persistWorldVitalsAfterCombat(
  playerId: string,
  characterId: number,
  playerCombatant: Combatant,
): void {
  const profile = getWorldProfile(playerId, characterId);
  const existing = profile.sessionSync?.worldVitals;
  const level = getAuthoritativeProgression(playerId, characterId).characterProfile.level ?? 1;
  const defaultMp = mpVitalsForLevel(level);

  const hpMax = Math.max(
    1,
    Math.floor(playerCombatant.hpMax ?? playerCombatant.maxHp ?? computePlayerHpMax()),
  );
  const hpCurrent = clampPlayerHpCurrent(resolveCombatantHp(playerCombatant), hpMax);
  const mpMax = existing?.mpMax ?? defaultMp.mpMax;
  const mpCurrent = existing?.mpCurrent ?? defaultMp.mpCurrent;

  saveWorldProfile(playerId, characterId, {
    ...profile,
    sessionSync: {
      ...profile.sessionSync,
      worldVitals: {
        hpCurrent,
        hpMax,
        mpCurrent: Math.max(0, Math.min(mpMax, Math.floor(mpCurrent))),
        mpMax,
      },
    },
  });
}
