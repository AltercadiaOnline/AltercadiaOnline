import { PHASER_MAP_LOADING_SCENE_KEY, PHASER_PRELOADER_SCENE_KEY } from '../PhaserConfig.js';
import { ZONE1_ID } from '../../../shared/world/zone1CreatureRegistry.js';
import {
  resolveZone1ProcessedCreatureAtlas,
  ZONE1_TOPDOWN_CREATURES_ATLAS_KEY,
} from '../../../config/zone1ProcessedCreatureAtlas.js';
import { loadCreatureAssetLoader } from '../../domains/ServiceRegistry.js';
import type { PhaserWorldSceneBase } from './MainScene.js';
import { revealPhaserMountHost } from '../phaserExplorationPipeline.js';
import { enablePhaserRenderMode } from '../../app/phaser/initPhaserReadyLayer.js';
import {
  consumePendingMapLoading,
  markPreloaderReady,
} from '../preloader/preloaderGate.js';
import {
  assertCriticalPreloaderTextures,
  isPreloaderCriticalTextureKey,
  PRELOADER_CRITICAL_TEXTURE_KEYS,
} from '../preloader/preloaderCriticalAssets.js';
import type { LoadingSceneInitData } from './createLoadingPhaserScene.js';
import {
  ROAD2_ATLAS_TEXTURE_KEY,
  ROAD2_SOURCE_PUBLIC_URL,
  resolveProcessedTilesetForPublicUrl,
} from '../tiled/processedTilesetPreload.js';

type PhaserLoaderFile = {
  readonly key?: string;
};

type PhaserSceneLoader = {
  on: (event: 'fileerror' | 'progress' | 'complete', callback: (...args: unknown[]) => void) => void;
};

type PhaserPreloaderScene = PhaserWorldSceneBase & {
  readonly load: PhaserWorldSceneBase['load'] & PhaserSceneLoader & {
    atlas: (key: string, textureUrl: string, atlasUrl: string) => void;
  };
  readonly textures: { exists: (key: string) => boolean };
  readonly scene: {
    start: (key: string, data?: LoadingSceneInitData) => void;
  };
};

type PhaserNamespace = {
  Scene: new (config?: string | Record<string, unknown>) => Record<string, unknown>;
};

function resolveLoaderFile(args: readonly unknown[]): PhaserLoaderFile {
  const [first, second] = args;
  if (second && typeof second === 'object') return second as PhaserLoaderFile;
  if (first && typeof first === 'object') return first as PhaserLoaderFile;
  return {};
}

/**
 * Primeira cena Phaser — carrega atlases críticos (Road2 + criaturas zone1), valida manifests
 * e só então delega ao carregamento do mapa (MapInstanceLoading → MapInstance / MainScene).
 */
export function createPreloaderPhaserScene(
  Phaser: PhaserNamespace,
): new () => PhaserWorldSceneBase {
  const { Scene } = Phaser;

  class PreloaderScene extends Scene {
    private transitionStarted = false;

    private criticalLoadFailed = false;

    private creatureAtlasManifestMissing = false;

    constructor() {
      super(PHASER_PRELOADER_SCENE_KEY);
    }

    init(): void {
      enablePhaserRenderMode();
      revealPhaserMountHost();
      this.transitionStarted = false;
      this.criticalLoadFailed = false;
      this.creatureAtlasManifestMissing = false;
    }

    preload(): void {
      const scene = this as unknown as PhaserPreloaderScene;
      revealPhaserMountHost();

      scene.load.on('progress', (value: unknown) => {
        const progress = typeof value === 'number' ? value : 0;
        console.log(`Carregando assets: ${Math.floor(progress * 100)}%`);
      });

      scene.load.on('complete', () => {
        void this.onPreloaderLoadComplete(scene);
      });

      scene.load.on('fileerror', (...args: unknown[]) => {
        const file = resolveLoaderFile(args);
        const key = file.key ?? '';
        if (key && isPreloaderCriticalTextureKey(key)) {
          this.criticalLoadFailed = true;
          console.error('[PreloaderScene] Asset crítico ausente no pré-carregamento:', key);
          return;
        }
        console.warn('[PreloaderScene] Asset ausente no pré-carregamento:', key || args[0]);
      });

      this.queueCriticalAtlases(scene);
    }

    create(): void {
      // Transição em load.complete → onPreloaderLoadComplete (create vazio de propósito).
    }

    private queueCriticalAtlases(scene: PhaserPreloaderScene): void {
      const road2Processed = resolveProcessedTilesetForPublicUrl(ROAD2_SOURCE_PUBLIC_URL);
      if (!road2Processed) {
        console.error('[PreloaderScene] Manifest Road2 ausente — rode npm run generate-assets.');
        this.criticalLoadFailed = true;
      } else if (!scene.textures.exists(ROAD2_ATLAS_TEXTURE_KEY)) {
        scene.load.atlas(
          ROAD2_ATLAS_TEXTURE_KEY,
          road2Processed.imageUrl,
          road2Processed.atlasUrl,
        );
        console.info(
          '[PreloaderScene] load.atlas',
          ROAD2_ATLAS_TEXTURE_KEY,
          road2Processed.imageUrl,
          road2Processed.atlasUrl,
        );
      }

      const zone1Atlas = resolveZone1ProcessedCreatureAtlas();
      if (!zone1Atlas) {
        console.error(
          '[PreloaderScene] Manifest zone1_top_down_creatures ausente — rode npm run generate-assets.',
        );
        this.creatureAtlasManifestMissing = true;
        this.criticalLoadFailed = true;
      } else if (!scene.textures.exists(ZONE1_TOPDOWN_CREATURES_ATLAS_KEY)) {
        scene.load.atlas(
          ZONE1_TOPDOWN_CREATURES_ATLAS_KEY,
          zone1Atlas.imageUrl,
          zone1Atlas.atlasUrl,
        );
        console.info(
          '[PreloaderScene] load.atlas',
          ZONE1_TOPDOWN_CREATURES_ATLAS_KEY,
          zone1Atlas.imageUrl,
          zone1Atlas.atlasUrl,
        );
      }
    }

    /** Validação de manifests + CreatureAssetLoader — só então libera preloaderGate. */
    private async onPreloaderLoadComplete(scene: PhaserPreloaderScene): Promise<void> {
      if (this.transitionStarted) return;
      this.transitionStarted = true;

      if (this.criticalLoadFailed || this.creatureAtlasManifestMissing) {
        throw new Error(
          '[PreloaderScene] Pré-carregamento crítico incompleto — '
          + `atlases esperados: ${PRELOADER_CRITICAL_TEXTURE_KEYS.join(', ')}. `
          + 'Rode npm run generate-assets.',
        );
      }

      assertCriticalPreloaderTextures(scene.textures);
      console.log('Atlases críticos no cache. Iniciando validação de criaturas.');

      const creatureLoader = await loadCreatureAssetLoader();
      await creatureLoader.startLoadingZone(ZONE1_ID);

      markPreloaderReady(scene.textures);
      console.log('Pré-carregamento concluído. Iniciando fluxo do mundo.');

      const pending = consumePendingMapLoading();
      if (pending) {
        scene.scene.start(PHASER_MAP_LOADING_SCENE_KEY, pending);
        return;
      }

      console.debug('[PreloaderScene] Pré-carregamento concluído — aguardando entrada no mundo.');
    }
  }

  return PreloaderScene as unknown as new () => PhaserWorldSceneBase;
}
