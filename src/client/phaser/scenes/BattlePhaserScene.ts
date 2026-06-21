import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { PHASER_BATTLE_SCENE_KEY } from '../PhaserConfig.js';
import { bindBattlePhaserSync } from '../battlePhaserSync.js';
import { createMainSceneClass, type PhaserWorldSceneBase } from './MainScene.js';

type PhaserNamespace = {
  Scene: new (config?: string | Record<string, unknown>) => PhaserWorldSceneBase;
};

/**
 * Cena de combate Phaser — chão, plataformas e sprites side-view (battleRenderBridge).
 */
export function createBattlePhaserScene(Phaser: PhaserNamespace): new () => PhaserWorldSceneBase {
  const MainScene = createMainSceneClass(Phaser as never);
  const { WIDTH, HEIGHT } = DESIGN_CONFIG.VIEWPORT;

  class BattleArenaScene extends MainScene {
    private teardownSync: (() => void) | null = null;

    constructor() {
      super(PHASER_BATTLE_SCENE_KEY);
    }

    onMainCreate(): void {
      this.cameras.main.setBounds(0, 0, WIDTH, HEIGHT);
      this.teardownSync = bindBattlePhaserSync(this);

      this.events.on('shutdown', () => {
        this.teardownSync?.();
        this.teardownSync = null;
      });
    }

    onMainUpdate(_time: number, _delta: number): void {}
  }

  return BattleArenaScene as unknown as new () => PhaserWorldSceneBase;
}
