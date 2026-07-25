// @ts-nocheck
import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import { PHASER_MAP_LOADING_SCENE_KEY } from '../PhaserConfig.js';
import { isTiledMapEnabled, resolveTiledMapDescriptor, } from '../../../config/tiledMapManifest.js';
import { purgeMapInstanceAssets, queueMapInstanceAssets, } from './mapInstanceAssetManifest.js';
import { isTilemapCacheReady } from '../tiled/tilemapCacheReady.js';
import { getMapInstanceSceneManager } from './MapInstanceSceneManager.js';
import { revealPhaserMountHost } from '../phaserExplorationPipeline.js';
import { enablePhaserRenderMode } from '../../app/phaser/initPhaserReadyLayer.js';
import { ensurePlaceholdersForFailedKeys, } from '../assets/phaserPlaceholderTexture.js';
const VIEW_W = GAME_CONFIG.VIEWPORT_WIDTH;
const VIEW_H = GAME_CONFIG.VIEWPORT_HEIGHT;
const BAR_WIDTH = 280;
const BAR_HEIGHT = 10;
const BAR_COLOR = 0x4ade80;
const BAR_BG_COLOR = 0x1e293b;
function resolveLoaderFile(args) {
    const [first, second] = args;
    if (second && typeof second === 'object')
        return second;
    if (first && typeof first === 'object')
        return first;
    return {};
}
/**
 * Cena mediadora — carrega 100% dos assets da instância alvo antes de `scene.start(targetScene)`.
 * Limpa cache da instância anterior na entrada e bloqueia transição em caso de erro de load.
 */
export function createLoadingPhaserScene(Phaser) {
    const { Scene } = Phaser;
    class MapInstanceLoadingScene extends Scene {
        targetScene = '';
        targetMapId = null;
        spawn;
        /** Algum asset (imagem) falhou — não bloqueia: motor usa placeholder. */
        assetErrors = 0;
        failedAssetKeys = new Set();
        statusText = null;
        progressFill = null;
        constructor() {
            super(PHASER_MAP_LOADING_SCENE_KEY);
        }
        init(data) {
            enablePhaserRenderMode();
            revealPhaserMountHost();
            this.targetScene = data?.targetScene ?? '';
            this.targetMapId = data?.targetMapId ?? null;
            this.spawn = data?.spawn;
            this.assetErrors = 0;
            this.failedAssetKeys.clear();
            this.statusText = null;
            this.progressFill = null;
            const scene = this;
            purgeMapInstanceAssets(scene.textures, scene.cache.tilemap, data?.sourceMapId);
        }
        preload() {
            const scene = this;
            revealPhaserMountHost();
            this.mountLoadingUi(scene);
            scene.load.on('fileerror', (...args) => {
                // Imagem ausente NÃO trava o mundo — motor renderiza placeholder no lugar.
                this.assetErrors += 1;
                const file = resolveLoaderFile(args);
                if (file.key) {
                    this.failedAssetKeys.add(file.key);
                }
                console.warn('[LoadingScene] Asset ausente (404) — seguindo com placeholder:', file.key, 'path:', file.src ?? file.url);
            });
            scene.load.on('progress', (value) => {
                const progress = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0;
                this.progressFill?.setSize(Math.max(1, BAR_WIDTH * progress), BAR_HEIGHT);
                const percent = Math.round(progress * 100);
                this.statusText?.setText(`Loading... ${percent}%`);
            });
            scene.load.on('complete', () => {
                this.statusText?.setText('Loading... 100%');
            });
            enablePhaserRenderMode();
            if (!this.targetMapId) {
                console.error('[LoadingScene] targetMapId ausente — transição abortada.');
                return;
            }
            queueMapInstanceAssets(scene, this.targetMapId);
        }
        create() {
            const scene = this;
            if (!this.targetScene || !this.targetMapId) {
                console.error('[LoadingScene] Parâmetros inválidos — transição abortada.');
                this.statusText?.setText('Falha no carregamento. Recarregue a página.');
                this.statusText?.setColor('#f87171');
                return;
            }
            // Crítico = JSON do mapa Tiled. Sem ele, não há o que montar.
            // Erros de imagem (tileset/prop/player) são tolerados: o motor usa placeholder.
            if (!this.isCriticalMapDataReady(scene)) {
                console.error('[LoadingScene] JSON do mapa ausente — transição abortada.', this.targetMapId);
                this.statusText?.setText('Falha no carregamento do mapa. Recarregue a página.');
                this.statusText?.setColor('#f87171');
                return;
            }
            if (this.assetErrors > 0) {
                const placeholders = ensurePlaceholdersForFailedKeys(scene.textures, this.failedAssetKeys);
                console.warn(`[LoadingScene] Entrando no mundo com ${this.assetErrors} asset(s) em placeholder (${placeholders} textura(s) gerada(s)).`);
            }
            const initData = this.spawn
                ? { spawn: this.spawn }
                : undefined;
            getMapInstanceSceneManager().commitTransition(this.targetMapId, this.targetScene);
            scene.scene.start(this.targetScene, initData);
        }
        /** Mapas Tiled exigem o JSON em cache; mapas legados não dependem de preload. */
        isCriticalMapDataReady(scene) {
            if (!this.targetMapId || !isTiledMapEnabled(this.targetMapId)) {
                return true;
            }
            const descriptor = resolveTiledMapDescriptor(this.targetMapId);
            if (!descriptor)
                return true;
            return isTilemapCacheReady(scene.cache.tilemap, descriptor.cacheKey);
        }
        mountLoadingUi(scene) {
            const centerX = VIEW_W / 2;
            const centerY = VIEW_H / 2;
            const barLeft = centerX - BAR_WIDTH / 2;
            const barY = centerY + 18;
            scene.add.rectangle(centerX, barY, BAR_WIDTH, BAR_HEIGHT, BAR_BG_COLOR);
            this.progressFill = scene.add.rectangle(barLeft, barY, 1, BAR_HEIGHT, BAR_COLOR);
            this.progressFill.setOrigin(0, 0.5);
            this.statusText = scene.add.text(centerX, centerY - 12, 'Loading...', {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#e2e8f0',
            });
        }
    }
    return MapInstanceLoadingScene;
}
