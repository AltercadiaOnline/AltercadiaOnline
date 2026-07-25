import type { GameState } from '../../shared/game/gameState.js';
import { GameState as GameStateValue } from '../../shared/game/gameState.js';
import { getGameStateManager } from '../../shared/state/GameStateManager.js';
import { syncReactBattleHudVisibility, syncReactHudVisibility } from '../app/shell/clientArchitecture.js';
import { syncWorldRenderForGameState } from '../worldRender/syncWorldRenderForGameState.js';
import { updateScale } from '../layout/gameLayout.js';
import type { MapManager } from '../managers/mapManager.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';

const WORLD_MAP_SCENE_ID = 'scene-exploration';

/** WorldMap retirado da árvore DOM — remontado ao voltar para EXPLORATION (teardown/logout). */
let detachedWorldMap: HTMLElement | null = null;
let worldMapInsertBefore: ChildNode | null = null;

export function isWorldMapMounted(): boolean {
  return document.getElementById(WORLD_MAP_SCENE_ID) !== null;
}

function revealExplorationScene(exploration: HTMLElement): void {
  exploration.classList.remove('hidden');
  exploration.setAttribute('aria-hidden', 'false');
}

function hideExplorationScene(): void {
  const exploration = document.getElementById(WORLD_MAP_SCENE_ID);
  if (!exploration) return;
  exploration.classList.add('hidden');
  exploration.setAttribute('aria-hidden', 'true');
}

function syncWorldDomOverlayLayersVisible(visible: boolean): void {
  for (const id of ['npc-names-layer', 'speech-bubbles-layer', 'game-ui-overlay']) {
    const layer = document.getElementById(id);
    if (!layer) continue;
    layer.classList.toggle('hidden', !visible);
    layer.toggleAttribute('aria-hidden', !visible);
  }
}

/**
 * Arena de batalha = DOM side-view; Construct só renderiza exploração.
 * Em TRANSITIONING/BATTLE o #game-render-column sai de cena via CSS
 * (body.battle-arena-active — ver styles.css).
 */
function syncBattleArenaBodyFlag(active: boolean): void {
  document.body.classList.toggle('battle-arena-active', active);
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

/** Desmonta WorldMap da árvore de renderização (remove do DOM) — só teardown explícito. */
export function unmountWorldMapScene(): void {
  const el = document.getElementById(WORLD_MAP_SCENE_ID);
  if (!el?.parentNode || detachedWorldMap) return;

  worldMapInsertBefore = el.nextSibling;
  detachedWorldMap = el;
  el.remove();
}

/**
 * Isolamento de renderização:
 * - EXPLORATION: Construct em #world-mount-root (#game-render-column);
 *   #scene-exploration é shell legado transparente (não cobre o iframe).
 * - TRANSITIONING / BATTLE: chrome de exploração oculto; Construct modo battle + HUD React
 */
export function applyGameStateToScenes(state: GameState): void {
  const combat = document.getElementById('scene-combat');
  const transition = document.getElementById('scene-transition');

  if (state === GameStateValue.Exploration) {
    syncBattleArenaBodyFlag(false);
    mountWorldMapScene();
    const exploration = document.getElementById(WORLD_MAP_SCENE_ID);
    if (exploration) revealExplorationScene(exploration);
    syncWorldDomOverlayLayersVisible(true);
    combat?.classList.add('hidden');
    transition?.classList.add('hidden');
    combat?.setAttribute('aria-hidden', 'true');
    transition?.setAttribute('aria-hidden', 'true');
    syncReactHudVisibility('game-container');
    syncReactBattleHudVisibility('game-container');
    syncWorldRenderForGameState(state);
    return;
  }

  hideExplorationScene();
  syncWorldDomOverlayLayersVisible(false);
  syncBattleArenaBodyFlag(true);

  if (state === GameStateValue.Transitioning) {
    combat?.classList.add('hidden');
    transition?.classList.remove('hidden');
    combat?.setAttribute('aria-hidden', 'true');
    transition?.setAttribute('aria-hidden', 'false');
    syncReactHudVisibility('game-container');
    syncReactBattleHudVisibility('game-container');
    return;
  }

  if (state === GameStateValue.Battle) {
    combat?.classList.remove('hidden');
    transition?.classList.add('hidden');
    combat?.setAttribute('aria-hidden', 'false');
    transition?.setAttribute('aria-hidden', 'true');
    syncReactHudVisibility('game-container');
    syncReactBattleHudVisibility('game-container');
    syncWorldRenderForGameState(state);
    // Letterbox 640×360 na coluna sem sidebar.
    requestAnimationFrame(() => {
      updateScale();
      requestAnimationFrame(() => updateScale());
    });
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
  const { getBattleScreen } = await import('../hud/index.js');
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
