// @ts-nocheck
import { PHASER_MAP_LOADING_SCENE_KEY, PHASER_PRELOADER_SCENE_KEY } from '../PhaserConfig.js';
import { ZONE1_ID } from '../../../shared/world/zone1CreatureRegistry.js';
import { resolveZone1ProcessedCreatureAtlas, ZONE1_TOPDOWN_CREATURES_ATLAS_KEY, } from '../../../config/zone1ProcessedCreatureAtlas.js';
import { loadCreatureAssetLoader } from '../../domains/ServiceRegistry.js';
import { revealPhaserMountHost } from '../phaserExplorationPipeline.js';
import { enablePhaserRenderMode } from '../../app/phaser/initPhaserReadyLayer.js';
import { consumePendingMapLoading, markPreloaderReady, } from '../preloader/preloaderGate.js';
import { assertCriticalPreloaderTextures, isPreloaderCriticalTextureKey, PRELOADER_CRITICAL_TEXTURE_KEYS, } from '../preloader/preloaderCriticalAssets.js';
import { ROAD2_ATLAS_TEXTURE_KEY, ROAD2_SOURCE_PUBLIC_URL, resolveProcessedTilesetForPublicUrl, } from '../tiled/processedTilesetPreload.js';
function resolveLoaderFile(args) {
    const [first, second] = args;
    if (second && typeof second === 'object')
        return second;
    if (first && typeof first === 'object')
        return first;
    return {};
}
/**
 * Primeira cena Phaser — carrega atlases críticos (Road2 + criaturas zone1), valida manifests
 * e só então delega ao carregamento do mapa (MapInstanceLoading → MapInstance / MainScene).
 */
export function createPreloaderPhaserScene(Phaser) {
    const { Scene } = Phaser;
    class PreloaderScene extends Scene {
        transitionStarted = false;
        criticalLoadFailed = false;
        creatureAtlasManifestMissing = false;
        constructor() {
            super(PHASER_PRELOADER_SCENE_KEY);
        }
        init() {
            enablePhaserRenderMode();
            revealPhaserMountHost();
            this.transitionStarted = false;
            this.criticalLoadFailed = false;
            this.creatureAtlasManifestMissing = false;
        }
        preload() {
            const scene = this;
            revealPhaserMountHost();
            scene.load.on('progress', (value) => {
                const progress = typeof value === 'number' ? value : 0;
                console.log(`Carregando assets: ${Math.floor(progress * 100)}%`);
            });
            scene.load.on('complete', () => {
                void this.onPreloaderLoadComplete(scene);
            });
            scene.load.on('fileerror', (...args) => {
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
        create() {
            // Transição em load.complete → onPreloaderLoadComplete (create vazio de propósito).
        }
        queueCriticalAtlases(scene) {
            const road2Processed = resolveProcessedTilesetForPublicUrl(ROAD2_SOURCE_PUBLIC_URL);
            if (!road2Processed) {
                console.error('[PreloaderScene] Manifest Road2 ausente — rode npm run generate-assets.');
                this.criticalLoadFailed = true;
            }
            else if (!scene.textures.exists(ROAD2_ATLAS_TEXTURE_KEY)) {
                // Folha contínua — tile layers usam addTilesetImage (não frames de atlas).
                scene.load.image(ROAD2_ATLAS_TEXTURE_KEY, road2Processed.imageUrl);
                console.info('[PreloaderScene] load.image', ROAD2_ATLAS_TEXTURE_KEY, road2Processed.imageUrl);
            }
            const zone1Atlas = resolveZone1ProcessedCreatureAtlas();
            if (!zone1Atlas) {
                console.error('[PreloaderScene] Manifest zone1_top_down_creatures ausente — rode npm run generate-assets.');
                this.creatureAtlasManifestMissing = true;
                this.criticalLoadFailed = true;
            }
            else if (!scene.textures.exists(ZONE1_TOPDOWN_CREATURES_ATLAS_KEY)) {
                scene.load.atlas(ZONE1_TOPDOWN_CREATURES_ATLAS_KEY, zone1Atlas.imageUrl, zone1Atlas.atlasUrl);
                console.info('[PreloaderScene] load.atlas', ZONE1_TOPDOWN_CREATURES_ATLAS_KEY, zone1Atlas.imageUrl, zone1Atlas.atlasUrl);
            }
        }
        /** Validação de manifests + CreatureAssetLoader — só então libera preloaderGate. */
        async onPreloaderLoadComplete(scene) {
            if (this.transitionStarted)
                return;
            this.transitionStarted = true;
            if (this.criticalLoadFailed || this.creatureAtlasManifestMissing) {
                throw new Error('[PreloaderScene] Pré-carregamento crítico incompleto — '
                    + `atlases esperados: ${PRELOADER_CRITICAL_TEXTURE_KEYS.join(', ')}. `
                    + 'Rode npm run generate-assets.');
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
    return PreloaderScene;
}
