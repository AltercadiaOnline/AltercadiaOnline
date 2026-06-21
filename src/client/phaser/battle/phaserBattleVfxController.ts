import type { CombatVfxEffectType } from '../../../shared/combat/combatVfxEffectTypes.js';
import { resolveFeedbackEffectType } from '../../../shared/combat/combatIntentFeedback.js';
import type { CombatActionIntentResultData } from '../../../shared/combat/combatIntentFeedback.js';
import type { ClassType } from '../../../shared/types/classes.js';
import { exactOptionalProps } from '../../../shared/util/exactOptionalProps.js';
import { triggerBattleRenderCue } from '../../app/bridge/battleRenderBridge.js';
import { getPendingIntentRegistry } from '../../sync/pendingIntentRegistry.js';
import { resolvePhaserFighterAnchor, type PhaserVfxPosition } from './phaserBattleVfxAnchors.js';
import { PHASER_PROJECTILE_STYLES } from './phaserBattleProjectileStyles.js';
import {
  playPhaserProjectileEffect,
  type PhaserVfxScene,
} from './phaserBattleProjectileEffects.js';
import { showPhaserBattleFloatingText } from './phaserBattleFloatingText.js';

export class PhaserBattleVfxController {
  private scene: PhaserVfxScene | null = null;

  private playing = false;

  mount(scene: PhaserVfxScene): void {
    this.scene = scene;
  }

  destroy(): void {
    this.scene = null;
    this.playing = false;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  async playProjectile(
    from: PhaserVfxPosition,
    to: PhaserVfxPosition,
    effectType: CombatVfxEffectType,
    classId: ClassType,
    options: {
      readonly damage?: number;
      readonly skipImpactEffects?: boolean;
      readonly skipRegistryLock?: boolean;
      readonly targetSide?: 'ally' | 'foe';
    } = {},
  ): Promise<boolean> {
    if (!this.scene) return false;

    const registry = getPendingIntentRegistry();
    const lockRegistry = !options.skipRegistryLock;
    this.playing = true;
    if (lockRegistry) registry.beginCombatVfxAnimation();

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
          showPhaserBattleFloatingText(
            this.scene as unknown as Parameters<typeof showPhaserBattleFloatingText>[0],
            to,
            options.damage,
            'damage',
          );
        }
      }
      return true;
    } finally {
      this.playing = false;
      if (lockRegistry) registry.endCombatVfxAnimation();
    }
  }

  async playFromGatewayResult(
    data: CombatActionIntentResultData,
    classId: ClassType,
    options: {
      readonly fromSide?: 'ally' | 'foe';
      readonly toSide?: 'ally' | 'foe';
      readonly skipImpactEffects?: boolean;
      readonly skipRegistryLock?: boolean;
    } = {},
  ): Promise<boolean> {
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

let activeController: PhaserBattleVfxController | null = null;

export function registerPhaserBattleVfxController(controller: PhaserBattleVfxController | null): void {
  activeController = controller;
}

export function getPhaserBattleVfxController(): PhaserBattleVfxController | null {
  return activeController;
}
