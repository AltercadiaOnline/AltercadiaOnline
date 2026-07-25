// @ts-nocheck
import { PHASER_MAIN_SCENE_KEY } from '../PhaserConfig.js';
function resolveLoaderFile(args) {
    const [first, second] = args;
    if (second && typeof second === 'object')
        return second;
    if (first && typeof first === 'object')
        return first;
    return {};
}
/**
 * Esqueleto base — somente mundo (física, colisão, sprites).
 * HUD, texto e barras ficam na camada React acima do canvas.
 *
 * Regra: NÃO usar `this.load.atlas` / `this.load.image` para tilesets globais (ex. road2_atlas).
 * Esses assets são carregados na PreloaderScene; subclasses consomem texturas já no cache.
 */
export function createMainSceneClass(Phaser) {
    const { Scene } = Phaser;
    class MainScene extends Scene {
        constructor(sceneKey = PHASER_MAIN_SCENE_KEY) {
            super(sceneKey);
        }
        preload() {
            const scene = this;
            scene.load.on('fileerror', (...args) => {
                const file = resolveLoaderFile(args);
                console.error('ERRO AO CARREGAR:', file.key, 'Caminho:', file.src ?? file.url);
            });
            scene.load.on('progress', (value) => {
                const progress = typeof value === 'number' ? value : 0;
                console.log('Progresso do loading:', progress * 100, '%');
            });
            this.onMainPreload();
        }
        create() {
            this.onMainCreate();
        }
        update(time, delta) {
            this.onMainUpdate(time, delta);
        }
        onMainPreload() {
            // Intencionalmente vazio — sem this.load.* (road2_atlas vem da PreloaderScene).
        }
        onMainCreate() { }
        onMainUpdate(_time, _delta) { }
    }
    return MainScene;
}
