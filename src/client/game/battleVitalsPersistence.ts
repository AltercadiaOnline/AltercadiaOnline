import type { PlayerWorldVitals } from '../../shared/character/equipmentState.js';
import { resolveDefeatRespawnHpCurrent, resolveSurrenderWorldHpCurrent } from '../../shared/character/playerVitals.js';
import type { BattleEndReason } from '../../shared/combat/battleEnded.js';
import { didPlayerWinBattle, resolveCombatantHp } from '../../shared/items/combatCreatureRegistry.js';
import { getLastDispatch } from '../combat/index.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';

import { getActionDispatcher } from '../ActionDispatcher.js';

export type PersistBattleEndVitalsOptions = {
  /** Motivo do fim — fuga aplica 50% do HP no momento da rendição (mín. 1). */
  readonly endReason?: BattleEndReason;
};

/** Captura HP final do combatente jogador e persiste no estado global + HUD. */
export function persistBattleEndVitals(
  options?: PersistBattleEndVitalsOptions,
): PlayerWorldVitals | null {
  if (getActionDispatcher().getMode() === 'online') {
    return null;
  }
  const dispatch = getLastDispatch();
  if (!dispatch) return null;

  const playerActorId = dispatch.ui.playerActorId;
  const player = dispatch.state.combatants[playerActorId];
  if (!player) return null;

  const hpMax = Math.max(
    1,
    Math.floor(player.hpMax ?? player.maxHp ?? getPlayerEquipmentStore().getSnapshot().vitals.hpMax),
  );
  const playerWon = didPlayerWinBattle(dispatch.state, playerActorId);
  const fled = options?.endReason === 'FORFEIT';
  const hpAtSurrender = fled
    ? (dispatch.state.forfeitHpByActorId?.[playerActorId] ?? resolveCombatantHp(player))
    : resolveCombatantHp(player);
  // Vitória → HP da luta. Fuga → 50% do HP no momento (mín. 1). Derrota → ~10% na cidade.
  const hpCurrent = playerWon
    ? Math.min(Math.max(0, Math.floor(hpAtSurrender)), hpMax)
    : fled
      ? resolveSurrenderWorldHpCurrent(hpAtSurrender, hpMax)
      : resolveDefeatRespawnHpCurrent(hpMax);
  const equipmentVitals = getPlayerEquipmentStore().getSnapshot().vitals;
  const vitals: PlayerWorldVitals = {
    ...equipmentVitals,
    hpCurrent: Math.min(hpCurrent, hpMax),
    hpMax,
  };

  getGlobalPlayerStore().applyWorldVitals(vitals);
  return vitals;
}
