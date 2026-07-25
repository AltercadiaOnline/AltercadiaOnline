// @ts-nocheck
import { resolveFeedbackEffectType } from '../../../shared/combat/combatIntentFeedback.js';
import { exactOptionalProps } from '../../../shared/util/exactOptionalProps.js';
import { triggerBattleRenderCue } from '../../app/bridge/battleRenderBridge.js';
import { getPendingIntentRegistry } from '../../sync/pendingIntentRegistry.js';
import { resolvePhaserFighterAnchor } from './phaserBattleVfxAnchors.js';
import { playPhaserProjectileEffect, } from './phaserBattleProjectileEffects.js';
import { showPhaserBattleFloatingText } from './phaserBattleFloatingText.js';
export class PhaserBattleVfxController {
    scene = null;
    playing = false;
    mount(scene) {
        this.scene = scene;
    }
    destroy() {
        this.scene = null;
        this.playing = false;
    }
    get isPlaying() {
        return this.playing;
    }
    async playProjectile(from, to, effectType, classId, options = {}) {
        if (!this.scene)
            return false;
        const registry = getPendingIntentRegistry();
        const lockRegistry = !options.skipRegistryLock;
        this.playing = true;
        if (lockRegistry)
            registry.beginCombatVfxAnimation();
        try {
            await playPhaserProjectileEffect({
                scene: this.scene,
                from,
                to,
                classId,
                effectType,
            });
            if (!options.skipImpactEffects) {
                const targetSide = options.targetSide ?? 'foe';
                triggerBattleRenderCue(targetSide, effectType === 'BLOCK_IMPACT' ? 'shield' : 'hit');
                if ((options.damage ?? 0) > 0 && options.damage !== undefined) {
                    showPhaserBattleFloatingText(this.scene, to, options.damage, 'damage');
                }
            }
            return true;
        }
        finally {
            this.playing = false;
            if (lockRegistry)
                registry.endCombatVfxAnimation();
        }
    }
    async playFromGatewayResult(data, classId, options = {}) {
        const fromSide = options.fromSide ?? 'ally';
        const toSide = options.toSide ?? 'foe';
        const from = resolvePhaserFighterAnchor(fromSide);
        const to = resolvePhaserFighterAnchor(toSide);
        const effectType = resolveFeedbackEffectType(data.feedback, data.action);
        return this.playProjectile(from, to, effectType, classId, exactOptionalProps({
            damage: data.damage,
            ...(options.skipImpactEffects !== undefined
                ? { skipImpactEffects: options.skipImpactEffects }
                : {}),
            ...(options.skipRegistryLock !== undefined
                ? { skipRegistryLock: options.skipRegistryLock }
                : {}),
            targetSide: toSide,
        }));
    }
}
let activeController = null;
export function registerPhaserBattleVfxController(controller) {
    activeController = controller;
}
export function getPhaserBattleVfxController() {
    return activeController;
}
