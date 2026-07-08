import type { MapTransitionPayload } from '../../../shared/world/protocol.js';
import {
  DEFAULT_MAP_ID,
  MAP_REGISTRY,
  type MapId,
} from '../../../shared/world/mapRegistry.js';
import {
  isMapInstanceSceneKey,
  resolveMapInstanceSceneKey,
} from './mapInstanceSceneKeys.js';
import type { MapInstanceSceneInitData } from './createMapInstancePhaserScene.js';
import type { LoadingSceneInitData } from './createLoadingPhaserScene.js';
import { getRenderLayerBridge } from '../../app/bridge/renderLayerBridge.js';
import { PHASER_MAP_LOADING_SCENE_KEY, PHASER_PRELOADER_SCENE_KEY } from '../PhaserConfig.js';
import { revealPhaserMountHost } from '../phaserExplorationPipeline.js';
import {
  consumePendingMapLoading,
  isPreloaderReady,
  requestMapLoadingAfterPreloader,
} from '../preloader/preloaderGate.js';

type PhaserSceneManager = {
  start: (key: string, data?: MapInstanceSceneInitData | LoadingSceneInitData) => void;
  stop: (key: string) => void;
  getScenes?: (active?: boolean) => readonly { readonly scene: { readonly key: string } }[];
};

type PhaserGameWithScenes = {
  scene: PhaserSceneManager;
};

export type MapInstanceTransitionOptions = {
  /** Flush de posição/inventário local antes de parar a cena (servidor já validou no portal). */
  readonly beforeTransition?: () => void;
  readonly spawn?: MapTransitionPayload;
};

/**
 * Gerencia instâncias Phaser por mapa — isola memória parando a cena anterior ao entrar na nova.
 */
export class MapInstanceSceneManager {
  private game: PhaserGameWithScenes | null = null;

  private registeredMapIds: readonly MapId[] = [];

  private activeMapId: MapId = DEFAULT_MAP_ID;

  private activeSceneKey: string | null = null;

  init(game: PhaserGameWithScenes, mapIds: readonly MapId[] = Object.keys(MAP_REGISTRY) as MapId[]): void {
    this.game = game;
    this.registeredMapIds = [...mapIds];
  }

  isInitialized(): boolean {
    return this.game !== null;
  }

  getActiveMapId(): MapId {
    return this.activeMapId;
  }

  getActiveSceneKey(): string | null {
    return this.activeSceneKey;
  }

  listRegisteredMapIds(): readonly MapId[] {
    return this.registeredMapIds;
  }

  /**
   * Troca de instância — persiste estado, para cena atual e delega o carregamento à LoadingScene.
   */
  transitionTo(targetMapId: MapId, options?: MapInstanceTransitionOptions): boolean {
    if (!this.game) {
      console.warn('[MapInstanceSceneManager] Game Phaser não inicializado.');
      return false;
    }

    if (!this.registeredMapIds.includes(targetMapId)) {
      console.warn('[MapInstanceSceneManager] Mapa não registrado:', targetMapId);
      return false;
    }

    options?.beforeTransition?.();

    const targetSceneKey = resolveMapInstanceSceneKey(targetMapId);
    const activeScenes = this.game.scene.getScenes?.(true) ?? [];
    const targetSceneRunning = activeScenes.some((entry) => entry.scene.key === targetSceneKey);
    const loadingSceneRunning = activeScenes.some(
      (entry) => entry.scene.key === PHASER_MAP_LOADING_SCENE_KEY,
    );

    if (!options?.spawn) {
      if (loadingSceneRunning && targetMapId === this.activeMapId) {
        console.debug(
          '[MapInstanceSceneManager] Carregamento do mapa já em andamento — ignorando transitionTo duplicado.',
        );
        return true;
      }

      if (targetSceneRunning && targetMapId === this.activeMapId) {
        console.debug(
          '[MapInstanceSceneManager] Instância do mapa já ativa — ignorando transitionTo duplicado.',
        );
        return true;
      }

      if (
        targetSceneRunning
        && this.activeSceneKey === targetSceneKey
      ) {
        return true;
      }
    }

    const currentSceneKey = this.resolveRunningSceneKey();
    const sourceMapId = this.activeMapId;

    if (currentSceneKey && currentSceneKey !== targetSceneKey) {
      this.game.scene.stop(currentSceneKey);
    }

    getRenderLayerBridge().markPhaserSceneReady(false);
    revealPhaserMountHost();

    const loadingData: LoadingSceneInitData = {
      targetScene: targetSceneKey,
      targetMapId,
      sourceMapId: sourceMapId !== targetMapId ? sourceMapId : null,
      ...(options?.spawn ? { spawn: options.spawn } : {}),
    };

    requestMapLoadingAfterPreloader(loadingData);
    if (isPreloaderReady()) {
      consumePendingMapLoading();
      this.game.scene.start(PHASER_MAP_LOADING_SCENE_KEY, loadingData);
    }

    return true;
  }

  /** Chamado pela LoadingScene após 100% dos assets — confirma mapa ativo. */
  commitTransition(mapId: MapId, sceneKey: string): void {
    this.activeMapId = mapId;
    this.activeSceneKey = sceneKey;
  }

  /** Primeira entrada no mundo — sem flush (login/spawn inicial). */
  bootDefaultMap(mapId: MapId = DEFAULT_MAP_ID): boolean {
    return this.transitionTo(mapId);
  }

  /** Evita recarregar o mapa quando exploração já está ativa ou em LoadingScene. */
  isActiveMapLoadingOrRunning(): boolean {
    if (!this.game) return false;

    const targetSceneKey = resolveMapInstanceSceneKey(this.activeMapId);
    const activeScenes = this.game.scene.getScenes?.(true) ?? [];
    return activeScenes.some(
      (entry) =>
        entry.scene.key === PHASER_PRELOADER_SCENE_KEY
        || entry.scene.key === PHASER_MAP_LOADING_SCENE_KEY
        || entry.scene.key === targetSceneKey,
    );
  }

  private resolveRunningSceneKey(): string | null {
    if (this.activeSceneKey) return this.activeSceneKey;

    const scenes = this.game?.scene.getScenes?.(true);
    if (!scenes) return null;

    for (const entry of scenes) {
      const key = entry.scene.key;
      if (isMapInstanceSceneKey(key) || key === PHASER_MAP_LOADING_SCENE_KEY || key === PHASER_PRELOADER_SCENE_KEY) {
        return key;
      }
    }

    return null;
  }
}

let manager: MapInstanceSceneManager | null = null;

export function getMapInstanceSceneManager(): MapInstanceSceneManager {
  if (!manager) {
    manager = new MapInstanceSceneManager();
  }
  return manager;
}

export function resetMapInstanceSceneManager(): void {
  manager = null;
}

export function resolveActiveMapInstanceSceneKey(): string {
  return resolveMapInstanceSceneKey(getMapInstanceSceneManager().getActiveMapId());
}
