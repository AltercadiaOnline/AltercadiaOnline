import {
  subscribeBattleRenderFrame,
  type BattleRenderFrame,
} from '../app/bridge/battleRenderBridge.js';
import { PhaserBattleArenaController } from './battle/phaserBattleArenaController.js';
import type { PhaserWorldSceneBase } from './scenes/MainScene.js';

export type BattlePhaserSyncHandlers = {
  readonly onFrame: (frame: BattleRenderFrame) => void;
};

/** Liga a cena Phaser aos snapshots do fluxo de combate legado. */
export function bindBattlePhaserSync(scene: PhaserWorldSceneBase): () => void {
  const arena = new PhaserBattleArenaController();
  arena.mount(scene as never);

  const offFrame = subscribeBattleRenderFrame((frame) => {
    arena.applyFrame(frame);
  });

  return () => {
    offFrame();
    arena.destroy();
  };
}
