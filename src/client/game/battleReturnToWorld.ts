import type { BattleEndReason } from '../../shared/combat/battleEnded.js';
import type { BattleEncounterData } from '../../shared/game/gameState.js';
import { CITY_01_ID } from '../../shared/world/maps/city01.js';
import { buildBattleEncounter } from '../../shared/world/monsterRegistry.js';
import {
  getGameStateManager,
  type GameStateTransitionHooks,
} from '../../shared/state/GameStateManager.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';

export type ReturnToExplorationOptions = {
  readonly victory: boolean;
  readonly endReason?: BattleEndReason;
  readonly monsterId?: string;
};

type ReturnToExplorationFn = (options: ReturnToExplorationOptions) => Promise<void>;

let transitionHooks: GameStateTransitionHooks | null = null;
let returnToExplorationFn: ReturnToExplorationFn | null = null;

export function registerBattleReturnBridge(
  hooks: GameStateTransitionHooks,
  returnToExploration: ReturnToExplorationFn,
): void {
  transitionHooks = hooks;
  returnToExplorationFn = returnToExploration;
}

export function unregisterBattleReturnBridge(): void {
  transitionHooks = null;
  returnToExplorationFn = null;
}

function buildFallbackEncounter(monsterId: string): BattleEncounterData {
  const snap = getGlobalPlayerStore().getExplorationSnapshot();
  return {
    monsterId,
    monsterName: 'Inimigo',
    mapId: snap?.mapId ?? CITY_01_ID,
    tileX: 0,
    tileY: 0,
    creatureId: 'rat',
  };
}

/** Reconstrói encontro quando START_COMBAT não passou por startBattle(). */
export function resolveEncounterForBattleExit(monsterId?: string): BattleEncounterData | null {
  const stored = getGlobalPlayerStore().getActiveEncounter();
  if (stored) return stored;

  const id = monsterId?.trim();
  if (!id) return null;

  return buildBattleEncounter(id) ?? buildFallbackEncounter(id);
}

async function forceEndBattleTransition(
  victory: boolean,
  monsterId?: string,
): Promise<void> {
  const hooks = transitionHooks;
  if (!hooks) {
    console.warn('[BattleReturn] Sem hooks de GameState — não foi possível voltar ao mapa.');
    return;
  }

  const manager = getGameStateManager();
  if (!manager.isBattle() && !manager.isTransitioning() && manager.isExploration()) {
    return;
  }

  const encounter =
    resolveEncounterForBattleExit(monsterId) ?? buildFallbackEncounter(monsterId ?? 'unknown');
  await manager.endBattle({ encounter, victory }, hooks);
}

/**
 * Volta ao mapa top-down após o jogador confirmar o fim da batalha.
 */
export async function requestReturnToExploration(
  options: ReturnToExplorationOptions,
): Promise<void> {
  if (returnToExplorationFn) {
    await returnToExplorationFn(options);
    return;
  }

  await forceEndBattleTransition(options.victory, options.monsterId);
}
