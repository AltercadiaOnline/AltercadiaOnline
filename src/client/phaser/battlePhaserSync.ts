// @ts-nocheck
import { subscribeBattleRenderFrame, } from '../app/bridge/battleRenderBridge.js';
import { PhaserBattleArenaController } from './battle/phaserBattleArenaController.js';
/** Liga a cena Phaser aos snapshots do fluxo de combate legado. */
export function bindBattlePhaserSync(scene) {
    const arena = new PhaserBattleArenaController();
    arena.mount(scene);
    const offFrame = subscribeBattleRenderFrame((frame) => {
        arena.applyFrame(frame);
    });
    return () => {
        offFrame();
        arena.destroy();
    };
}
