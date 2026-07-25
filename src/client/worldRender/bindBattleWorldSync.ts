// @ts-nocheck
import { subscribeBattleRenderFrame, } from '../app/bridge/battleRenderBridge.js';
/** Liga battleRenderBridge → Construct (arena visual; HUD React à parte). */
export function bindBattleWorldSync(engine) {
    return subscribeBattleRenderFrame((frame) => {
        engine.applyBattleFrame(frame);
    });
}
