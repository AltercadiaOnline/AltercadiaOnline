import type { GameState } from '../../shared/game/gameState.js';
import { GameState as GameStateValue } from '../../shared/game/gameState.js';
import { getGameStateManager } from '../../shared/state/GameStateManager.js';
import { getBattleScreen } from '../hud/index.js';
import type { MapManager } from '../managers/mapManager.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';

const WORLD_MAP_SCENE_ID = 'scene-exploration';

/** WorldMap retirado da árvore DOM — remontado ao voltar para EXPLORATION. */
let detachedWorldMap: HTMLElement | null = null;
let worldMapInsertBefore: ChildNode | null = null;

export function isWorldMapMounted(): boolean {
  return document.getElementById(WORLD_MAP_SCENE_ID) !== null;
}

function revealExplorationScene(exploration: HTMLElement): void {
  exploration.classList.remove('hidden');
  exploration.setAttribute('aria-hidden', 'false');
}

/** Remonta #scene-exploration no #game-container e garante visibilidade. */
export function mountWorldMapScene(container: ParentNode = document): void {
  if (detachedWorldMap) {
    const host = container.querySelector('#game-container') ?? container;
    host.insertBefore(detachedWorldMap, worldMapInsertBefore);
    revealExplorationScene(detachedWorldMap);
    detachedWorldMap = null;
    worldMapInsertBefore = null;
    return;
  }

  const mounted = document.getElementById(WORLD_MAP_SCENE_ID);
  if (mounted) {
    revealExplorationScene(mounted);
  }
}

/** Desmonta WorldMap da árvore de renderização (remove do DOM). */
export function unmountWorldMapScene(): void {
  const el = document.getElementById(WORLD_MAP_SCENE_ID);
  if (!el?.parentNode || detachedWorldMap) return;

  worldMapInsertBefore = el.nextSibling;
  detachedWorldMap = el;
  el.remove();
}

/**
 * Isolamento de renderização:
 * - EXPLORATION: WorldMap montado
 * - TRANSITIONING / BATTLE: WorldMap desmontado, overlay ou combate visível
 */
export function applyGameStateToScenes(state: GameState): void {
  const combat = document.getElementById('scene-combat');
  const transition = document.getElementById('scene-transition');

  if (state === GameStateValue.Exploration) {
    mountWorldMapScene();
    const exploration = document.getElementById(WORLD_MAP_SCENE_ID);
    if (exploration) revealExplorationScene(exploration);
    combat?.classList.add('hidden');
    transition?.classList.add('hidden');
    combat?.setAttribute('aria-hidden', 'true');
    transition?.setAttribute('aria-hidden', 'true');
    return;
  }

  unmountWorldMapScene();

  if (state === GameStateValue.Transitioning) {
    combat?.classList.add('hidden');
    transition?.classList.remove('hidden');
    combat?.setAttribute('aria-hidden', 'true');
    transition?.setAttribute('aria-hidden', 'false');
    return;
  }

  if (state === GameStateValue.Battle) {
    combat?.classList.remove('hidden');
    transition?.classList.add('hidden');
    combat?.setAttribute('aria-hidden', 'false');
    transition?.setAttribute('aria-hidden', 'true');
  }
}

export const SceneManager = {
  showExploration(): void {
    applyGameStateToScenes(GameStateValue.Exploration);
  },

  showCombat(): void {
    applyGameStateToScenes(GameStateValue.Battle);
  },

  showTransition(): void {
    applyGameStateToScenes(GameStateValue.Transitioning);
  },
};

export function handlePortalTrigger(
  targetMapId: string,
  targetPosition: { x: number; y: number; facing?: PlayerFacing; portalLabel?: string },
  mapManager: MapManager,
): void {
  mapManager.loadMap(targetMapId as MapId, targetPosition);
  console.log('[Altercadia] Transição de mapa', {
    mapId: targetMapId,
    label: targetPosition.portalLabel ?? null,
  });
}

export async function enterBattleWithFade(): Promise<void> {
  await getBattleScreen()?.enterWithFade();
}

/** Restaura WorldMap no DOM — uso em teardown / logout. */
export function resetWorldMapSceneMount(): void {
  mountWorldMapScene();
}

/** Força DOM alinhado ao estado atual (fallback se endBattle não notificar ouvintes). */
export function syncGameScenesToCurrentState(): void {
  applyGameStateToScenes(getGameStateManager().getState());
}
