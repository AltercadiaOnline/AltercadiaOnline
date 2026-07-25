// @ts-nocheck
import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { getRenderLayerBridge } from '../../app/bridge/renderLayerBridge.js';
import { PHASER_BATTLE_SCENE_KEY } from '../PhaserConfig.js';
import { activatePhaserExplorationPipeline } from '../phaserExplorationPipeline.js';
import { bindBattlePhaserSync } from '../battlePhaserSync.js';
import { createMainSceneClass } from './MainScene.js';
/**
 * Cena de combate Phaser — chão, plataformas e sprites side-view (battleRenderBridge).
 */
export function createBattlePhaserScene(Phaser) {
    const MainScene = createMainSceneClass(Phaser);
    const { WIDTH, HEIGHT } = DESIGN_CONFIG.VIEWPORT;
    class BattleArenaScene extends MainScene {
        teardownSync = null;
        constructor() {
            super(PHASER_BATTLE_SCENE_KEY);
        }
        onMainCreate() {
            this.cameras.main.setBounds(0, 0, WIDTH, HEIGHT);
            this.teardownSync = bindBattlePhaserSync(this);
            activatePhaserExplorationPipeline();
            getRenderLayerBridge().setActivePhaserScene('battle');
            this.events.on('shutdown', () => {
                this.teardownSync?.();
                this.teardownSync = null;
            });
        }
        onMainUpdate(_time, _delta) { }
    }
    return BattleArenaScene;
}
