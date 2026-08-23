/**
 * Ciclo de vida cliente: exploração ↔ batalha.
 * Único ponto para fechar HUD social, limpar remotes e decidir teleporte local.
 */

import { BattleType } from '../../shared/combat/battleType.js';
import {
  resolveBattleArenaMode,
  shouldCityRespawnAfterBattle,
  type BattleArenaMode,
  type BattleWorldRestoreInput,
} from '../../shared/combat/battleWorldRestorePolicy.js';
import { closePlayerInspectHud } from '../world/playerInspectStore.js';
import { clearCasualDuelHud } from '../world/casualDuelStore.js';
import { clearRemoteEntitySyncBridge } from '../world/remoteEntitySyncBridge.js';

let pendingArenaMode: BattleArenaMode = 'pve';
let activeBattleType: BattleType = BattleType.PVE;

/** START_COMBAT / mount — memoriza modo da arena antes do 1º combat-event. */
export function rememberBattleEnterContext(input: {
  readonly battleType?: string | null;
  readonly matchId?: string | null;
}): void {
  const isPvp =
    input.battleType === BattleType.PVP
    || input.battleType === 'PVP'
    || (typeof input.matchId === 'string' && input.matchId.length > 0);
  activeBattleType = isPvp ? BattleType.PVP : BattleType.PVE;
  pendingArenaMode = resolveBattleArenaMode(activeBattleType);
}

export function getPendingBattleArenaMode(): BattleArenaMode {
  return pendingArenaMode;
}

export function getActiveBattleType(): BattleType {
  return activeBattleType;
}

export function setActiveBattleTypeFromDispatch(battleType: BattleType | string | null | undefined): void {
  if (battleType === BattleType.PVP || battleType === 'PVP') {
    activeBattleType = BattleType.PVP;
    pendingArenaMode = 'pvp';
    return;
  }
  if (battleType === BattleType.PVE || battleType === 'PVE') {
    activeBattleType = BattleType.PVE;
    pendingArenaMode = 'pve';
  }
}

/**
 * Antes de montar BattleScreen: fecha ficha/convite e limpa peers interpolados
 * (evita sprite fantasma do oponente ainda “explorando” no overlay).
 */
export function onBattleEnterClient(): void {
  closePlayerInspectHud();
  clearCasualDuelHud();
  clearRemoteEntitySyncBridge();
}

/** Após voltar ao mapa — limpa contexto de arena; remotes voltam via state-sync. */
export function onBattleExitClient(): void {
  pendingArenaMode = 'pve';
  activeBattleType = BattleType.PVE;
}

export function resolveLocalDefeatCityTeleport(
  input: Partial<BattleWorldRestoreInput> & {
    readonly victory: boolean;
  },
): boolean {
  return shouldCityRespawnAfterBattle({
    battleType: input.battleType ?? activeBattleType,
    victory: input.victory,
    ...(input.endReason !== undefined ? { endReason: input.endReason } : {}),
    ...(input.casualPvp === true ? { casualPvp: true } : {}),
  });
}
