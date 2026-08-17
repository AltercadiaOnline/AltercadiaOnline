import {

  CombatEventType,

  type CombatEvent,

  type DamageDealtEvent,

} from '../../shared/events.js';

import {

  COMBAT_ATTACK_WINDUP_MS,

  COMBAT_HIT_ANIM_BLOCK_MS,

  COMBAT_HIT_ANIM_LOG_CAP_MS,

  COMBAT_HIT_ANIM_MS,

  COMBAT_HIT_IMPACT_HOLD_MS,

  COMBAT_HP_ANIM_CLOSING_MS,

  COMBAT_HP_ANIM_MS,

  COMBAT_STRIKE_RECOVER_MS,

  COMBAT_STATUS_PORTRAIT_FAST_MS,

  COMBAT_STATUS_PORTRAIT_MS,

} from '../../shared/combat/combatSequenceConstants.js';

import type { BattleScreen } from './client/battleScreen.js';

import { CombatAnimator } from './CombatAnimator.js';

import { showHealImpact, showTechnicalImpact, type TechnicalImpactPayload } from './TechnicalImpact.js';

import {
  resolveBattleHitHudSide,
  resolveBattleReceiverHudSide,
  showBattleHitPop,
  type BattleEffectSide,
} from './battleEffectsLayer.js';

import { sumAttackBreakdownTotal, sumDefenseBreakdownTotal } from '../../shared/combat/combatBreakdownBuilder.js';
import type { CombatActionBreakdown } from '../../shared/combat/combatActionBreakdown.js';
import { pickCombatHitMitigation } from '../../shared/combat/combatHitMitigation.js';

import { BattleHealthBar } from './BattleHealthBar.js';

import {

  resolvePortraitOverlayChips,

  syncPortraitOverlayChips,

} from './battlePortraitOverlay.js';

import { flashStatusPortraitCue } from './statusEventPortraitCue.js';

import { isBattlePlaybackClosing } from './combatPlaybackState.js';
import { isAgilityTempoLogLine } from '../../shared/combat/agilityTempo.js';
import type { CombatFeedbackStep } from '../../shared/combat/combatVisualFeedback.js';
import { resolveHitMoveDisplayName } from '../../shared/combat/moveDisplayLabels.js';
import { exactOptionalProps } from '../../shared/util/exactOptionalProps.js';
import { logCriticalBattleError } from './combatSafeExecution.js';

function showCombatHitImpactBundle(options: {
  readonly amount: number;
  readonly side: BattleEffectSide;
  readonly mode?: 'damage' | 'heal' | 'shield';
  readonly technical?: TechnicalImpactPayload;
}): void {
  const mode = options.mode ?? 'damage';
  const { side } = options;
  // Âncora dummy: montagem real é por zona (side) na camada livre da arena.
  const mountDoc = typeof document !== 'undefined' ? document.body : (null as unknown as HTMLElement);
  if (!mountDoc) return;

  if (options.technical && mode === 'damage') {
    showTechnicalImpact(mountDoc, options.technical, {
      compactScene: true,
      suppressFinalDamage: options.amount > 0,
      lessonMath: true,
      durationMs: 4200,
      side,
    });
    if (options.amount > 0) {
      showBattleHitPop(side, options.amount, mode);
    }
    return;
  }

  if (options.amount > 0 || mode !== 'damage') {
    showBattleHitPop(side, options.amount, mode);
  }

  if (options.technical) {
    showTechnicalImpact(mountDoc, options.technical, {
      compactScene: mode === 'shield',
      side,
    });
  }
}

function buildTechnicalImpactPayload(options: {
  readonly amount: number;
  readonly attackBreakdown?: CombatActionBreakdown;
  readonly defenseBreakdown?: CombatActionBreakdown;
  readonly attackTotal?: number;
  readonly defenseTotal?: number;
  readonly moveName?: string;
  readonly skillId?: string;
  readonly damagePayload?: DamageDealtEvent['payload'];
}): TechnicalImpactPayload {
  const mitigation = options.damagePayload
    ? pickCombatHitMitigation(options.damagePayload)
    : undefined;

  return {
    damageTotal: options.amount,
    ...(options.attackBreakdown
      ? {
          attackBreakdown: options.attackBreakdown,
          ...(options.attackTotal !== undefined ? { attackTotal: options.attackTotal } : {}),
        }
      : {}),
    ...(options.defenseBreakdown
      ? {
          defenseBreakdown: options.defenseBreakdown,
          ...(options.defenseTotal !== undefined
            ? { protectionTotal: options.defenseTotal, defenseTotal: options.defenseTotal }
            : {}),
        }
      : {}),
    ...(options.moveName ? { moveName: options.moveName } : {}),
    ...(options.skillId ? { skillId: options.skillId } : {}),
    ...(mitigation ? { mitigation } : {}),
  };
}



export type BattleControllerOptions = {

  readonly getBattleScreen: () => BattleScreen | null;

  readonly healthBar?: BattleHealthBar;

  readonly root?: ParentNode;

};



/**

 * Orquestra animações side-view por tipo de CombatEvent.

 * Chamado dentro da fila do CombatSequenceManager — não cria fila própria.

 */

export class BattleController {

  private readonly getBattleScreen: () => BattleScreen | null;

  private readonly healthBar: BattleHealthBar;



  constructor(options: BattleControllerOptions) {

    this.getBattleScreen = options.getBattleScreen;

    this.healthBar = options.healthBar ?? new BattleHealthBar();

  }

  getScreen(): BattleScreen | null {
    return this.getBattleScreen();
  }

  async playEvent(event: CombatEvent): Promise<void> {

    switch (event.type) {

      case CombatEventType.DAMAGE_DEALT:

        await this.handleAttackEvent(event);

        break;

      case CombatEventType.RUNE_TRIGGERED:

        await this.getBattleScreen()?.playCombatCue(event.payload.actorId, 'rune');

        break;

      case CombatEventType.CONSUMABLE_USED:

        await this.getBattleScreen()?.playCombatCue(event.payload.actorId, 'heal');

        break;

      case CombatEventType.HEAL_APPLIED:

        await this.handleHealEvent(event);

        break;

      case CombatEventType.SHIELD_APPLIED:

        await this.handleShieldEvent(event);

        break;

      case CombatEventType.STATUS_APPLIED:

        await this.handleStatusEvent(event);

        break;

      case CombatEventType.STATUS_EVENT:

        await this.handleStatusCombatEvent(event);

        break;

      case CombatEventType.COMBAT_LOG:

        if (!isBattlePlaybackClosing() && !isAgilityTempoLogLine(event.line)) {

          await CombatAnimator.wait(Math.min(COMBAT_HIT_ANIM_MS, COMBAT_HIT_ANIM_LOG_CAP_MS));

        }

        break;

      case CombatEventType.SKILL_USED: {

        const screen = this.getBattleScreen();

        screen?.setPortraitStance(event.payload.actorId, 'attack');

        break;

      }

      case CombatEventType.COMBAT_FINISHED:

        console.log('DEBUG: Evento recebido em BattleController (COMBAT_FINISHED)');

        break;

      default:

        break;

    }

  }



  /**

   * Golpe completo: lunge do atacante → pop + matemática + shake → barra de HP.

   */

  async handleAttackEvent(event: DamageDealtEvent): Promise<void> {

    const screen = this.getBattleScreen();

    if (!screen) {

      await CombatAnimator.wait(COMBAT_ATTACK_WINDUP_MS);

      return;

    }



    const { sourceId, targetId, amount, hpAfter, attackBreakdown, defenseBreakdown, skillId, skillName } = event.payload;

    const moveName = resolveHitMoveDisplayName(exactOptionalProps({ skillId, skillName }));



    if (isBattlePlaybackClosing()) {

      if (hpAfter > 0) {
        screen.setPortraitStance(sourceId, 'idle');
      }

      const hpTargets = screen.getHpBarTargets(targetId);
      if (hpTargets) {
        if (typeof requestAnimationFrame === 'function') {
          await this.healthBar.animateTo(hpTargets, hpAfter, COMBAT_HP_ANIM_CLOSING_MS);
        } else {
          await this.healthBar.animateToWithWait(hpTargets, hpAfter, COMBAT_HP_ANIM_CLOSING_MS);
        }
      }
      screen.commitCombatantHp(targetId, hpAfter);

      return;

    }



    screen.setPortraitStance(sourceId, 'attack');

    await screen.playCombatCue(sourceId, 'attack');



    const sourceIsFoe =
      sourceId.startsWith('enemy_') || sourceId.startsWith('mirror_');
    const targetIsFoe =
      targetId.startsWith('enemy_') || targetId.startsWith('mirror_');
    const useAllyAnchor = sourceIsFoe || !targetIsFoe;
    const hitHudSide = resolveBattleHitHudSide({ sourceId, targetId });
    let targetPortrait: HTMLElement | null = null;
    if (typeof document !== 'undefined') {
      targetPortrait = document.querySelector<HTMLElement>(
        useAllyAnchor ? '#battle-player-portrait' : '#battle-opponent-portrait',
      );
    }
    targetPortrait = targetPortrait ?? screen.getPortraitElement(
      useAllyAnchor ? (screen.getPlayerActorId() ?? targetId) : targetId,
    );

    if (!targetPortrait) {
      const cueId = useAllyAnchor ? (screen.getPlayerActorId() ?? targetId) : targetId;
      if (amount > 0) {
        await screen.playCombatCue(cueId, 'hit');
      } else if (defenseBreakdown) {
        await screen.playCombatCue(cueId, 'shield');
      }
      const hpTargets = screen.getHpBarTargets(targetId);
      if (hpTargets) {
        await this.healthBar.animateTo(hpTargets, hpAfter, COMBAT_HP_ANIM_MS);
      }
      screen.commitCombatantHp(targetId, hpAfter);
      if (hpAfter > 0) {
        screen.setPortraitStance(sourceId, 'idle');
      }
      return;
    }

    const attackTotal = attackBreakdown ? sumAttackBreakdownTotal(attackBreakdown) : undefined;

    const defenseTotal = defenseBreakdown ? sumDefenseBreakdownTotal(defenseBreakdown) : undefined;



    if (targetPortrait) {

      const mode = amount > 0 ? 'damage' : defenseBreakdown ? 'shield' : 'damage';

      const popAmount = amount > 0 ? amount : defenseTotal ?? 0;

      const hasTechnical = Boolean(attackBreakdown || defenseBreakdown || amount >= 0);



      if (popAmount > 0 || mode !== 'damage' || hasTechnical) {

        showCombatHitImpactBundle({
          side: hitHudSide,
          amount: popAmount,
          mode,
          ...(hasTechnical
            ? {
                technical: buildTechnicalImpactPayload({
                  amount,
                  ...(attackBreakdown
                    ? {
                        attackBreakdown,
                        ...(attackTotal !== undefined ? { attackTotal } : {}),
                      }
                    : {}),
                  ...(defenseBreakdown
                    ? {
                        defenseBreakdown,
                        ...(defenseTotal !== undefined ? { defenseTotal } : {}),
                      }
                    : {}),
                  ...(moveName ? { moveName } : {}),
                  ...(skillId ? { skillId } : {}),
                  damagePayload: event.payload,
                }),
              }
            : {}),
        });

      }

    }



    if (amount > 0) {

      await screen.playCombatCue(targetId, 'hit');

    } else if (defenseBreakdown) {

      await screen.playCombatCue(targetId, 'shield');

    } else {

      await CombatAnimator.wait(Math.min(COMBAT_HIT_ANIM_MS, COMBAT_HIT_ANIM_BLOCK_MS));

    }



    await CombatAnimator.wait(COMBAT_HIT_IMPACT_HOLD_MS);



    const hpTargets = screen.getHpBarTargets(targetId);
    if (hpTargets) {
      if (typeof requestAnimationFrame === 'function') {
        await this.healthBar.animateTo(hpTargets, hpAfter, COMBAT_HP_ANIM_MS);
      } else {
        await this.healthBar.animateToWithWait(hpTargets, hpAfter, COMBAT_HP_ANIM_MS);
      }
    }
    screen.commitCombatantHp(targetId, hpAfter);

    if (hpAfter > 0) {
      screen.setPortraitStance(sourceId, 'idle');
      await CombatAnimator.wait(COMBAT_STRIKE_RECOVER_MS);
    }

  }



  async handleHealEvent(event: Extract<CombatEvent, { type: typeof CombatEventType.HEAL_APPLIED }>): Promise<void> {

    const screen = this.getBattleScreen();

    if (!screen) return;



    const { targetId, amount, hpAfter } = event.payload;

    const portrait = screen.getPortraitElement(targetId);

    if (portrait && amount > 0) {
      const healSide = resolveBattleReceiverHudSide(targetId);
      showBattleHitPop(healSide, amount, 'heal');
      showHealImpact(portrait, amount);
    }

    await screen.playCombatCue(targetId, 'heal');



    const hpTargets = screen.getHpBarTargets(targetId);
    if (hpTargets) {
      await this.healthBar.animateTo(hpTargets, hpAfter, COMBAT_HP_ANIM_MS);
    }
    screen.commitCombatantHp(targetId, hpAfter);

  }



  async handleShieldEvent(event: Extract<CombatEvent, { type: typeof CombatEventType.SHIELD_APPLIED }>): Promise<void> {

    const screen = this.getBattleScreen();

    if (!screen) return;



    const portrait = screen.getPortraitElement(event.payload.actorId);

    if (!portrait) return;



    portrait.classList.add('is-combat-shielded');

    await CombatAnimator.wait(COMBAT_HIT_ANIM_MS);

    portrait.classList.remove('is-combat-shielded');

  }



  async handleStatusEvent(event: Extract<CombatEvent, { type: typeof CombatEventType.STATUS_APPLIED }>): Promise<void> {

    const screen = this.getBattleScreen();

    if (!screen) return;



    const portrait = screen.getPortraitElement(event.payload.targetId);

    if (!portrait) return;



    const defensive = ['STATUS_IMMUNITY', 'THORNS', 'HEAL_ECHO'].includes(event.payload.statusId);

    if (defensive) {

      portrait.classList.add('is-combat-shielded');

      await CombatAnimator.wait(Math.min(COMBAT_HIT_ANIM_MS, COMBAT_STATUS_PORTRAIT_MS));

      portrait.classList.remove('is-combat-shielded');

    }

  }



  async handleStatusCombatEvent(
    event: Extract<CombatEvent, { type: typeof CombatEventType.STATUS_EVENT }>,
  ): Promise<void> {
    const screen = this.getBattleScreen();
    if (!screen) return;

    const portrait = screen.getPortraitElement(event.payload.targetId);
    if (!portrait) return;

    flashStatusPortraitCue(portrait, event.payload.statusId, event.payload.message);

    const { phase, statusId } = event.payload;
    const defensive = ['STATUS_IMMUNITY', 'THORNS', 'HEAL_ECHO', 'MARCO_CC_IMMUNE'].includes(statusId);

    if (phase === 'tick' || phase === 'skip') {
      portrait.classList.add('is-combat-hit');
      await CombatAnimator.wait(Math.min(COMBAT_HIT_ANIM_MS, COMBAT_STATUS_PORTRAIT_MS));
      portrait.classList.remove('is-combat-hit');
      return;
    }

    if (phase === 'applied' || phase === 'renewed') {
      if (defensive) {
        portrait.classList.add('is-combat-shielded');
        await CombatAnimator.wait(Math.min(COMBAT_HIT_ANIM_MS, COMBAT_STATUS_PORTRAIT_MS));
        portrait.classList.remove('is-combat-shielded');
      } else {
        portrait.classList.add('is-combat-hit');
        await CombatAnimator.wait(Math.min(COMBAT_HIT_ANIM_MS, COMBAT_STATUS_PORTRAIT_FAST_MS));
        portrait.classList.remove('is-combat-hit');
      }
    }
  }



  /** Executa um passo do roteiro `CombatVisualFeedback` (fila do CombatFeedbackOrchestrator). */
  async playFeedbackStep(
    step: CombatFeedbackStep,
    context?: { readonly damageEvent?: DamageDealtEvent },
  ): Promise<void> {
    try {
      await this.playFeedbackStepUnsafe(step, context);
    } catch (error) {
      logCriticalBattleError('battle-controller', error);
    }
  }

  private async playFeedbackStepUnsafe(
    step: CombatFeedbackStep,
    context?: { readonly damageEvent?: DamageDealtEvent },
  ): Promise<void> {
    const screen = this.getBattleScreen();

    switch (step.kind) {
      case 'portrait_stance':
        screen?.setPortraitStance(step.combatantId, step.stance);
        return;

      case 'portrait_cue':
        await screen?.playCombatCue(step.combatantId, step.cue);
        return;

      case 'wait':
        await CombatAnimator.wait(step.ms);
        return;

      case 'damage_impact': {
        // Dano RECEBIDO: monstro→player = zona ally (esq); player→criatura = zona foe (dir).
        const damageEvent = context?.damageEvent;
        const payload =
          damageEvent?.payload.targetId === step.targetId
            ? damageEvent.payload
            : undefined;
        const impactTargetId = step.targetId;
        const sourceIsFoe =
          step.sourceId.startsWith('enemy_') || step.sourceId.startsWith('mirror_');
        const targetIsFoe =
          impactTargetId.startsWith('enemy_') || impactTargetId.startsWith('mirror_');
        const useAllyAnchor = sourceIsFoe || !targetIsFoe;
        const hitHudSide = resolveBattleHitHudSide({
          sourceId: step.sourceId,
          targetId: impactTargetId,
        });
        let targetPortrait: HTMLElement | null = null;
        if (typeof document !== 'undefined') {
          targetPortrait = document.querySelector<HTMLElement>(
            useAllyAnchor ? '#battle-player-portrait' : '#battle-opponent-portrait',
          );
        }
        targetPortrait = targetPortrait
          ?? screen?.getPortraitElement(useAllyAnchor ? (screen.getPlayerActorId() ?? impactTargetId) : impactTargetId)
          ?? null;
        if (!targetPortrait) return;

        const cueTargetId = useAllyAnchor
          ? (screen?.getPlayerActorId() ?? impactTargetId)
          : impactTargetId;

        const amount = step.amount;
        const attackBreakdown = step.attackBreakdown ?? payload?.attackBreakdown;
        const defenseBreakdown = step.defenseBreakdown ?? payload?.defenseBreakdown;
        const skillId = step.skillId ?? payload?.skillId;
        const moveName = resolveHitMoveDisplayName(exactOptionalProps({
          skillId,
          skillName: step.skillName ?? payload?.skillName,
        }));
        const attackTotal = attackBreakdown ? sumAttackBreakdownTotal(attackBreakdown) : undefined;
        const defenseTotal = defenseBreakdown ? sumDefenseBreakdownTotal(defenseBreakdown) : undefined;
        const mode = amount > 0 ? 'damage' : defenseBreakdown ? 'shield' : 'damage';
        const popAmount = amount > 0 ? amount : defenseTotal ?? 0;
        const hasTechnical = Boolean(attackBreakdown || defenseBreakdown || amount >= 0);

        const hitCuePromise =
          amount > 0
            ? screen?.playCombatCue(cueTargetId, 'hit')
            : defenseBreakdown
              ? screen?.playCombatCue(cueTargetId, 'shield')
              : Promise.resolve();

        if (popAmount > 0 || mode !== 'damage' || hasTechnical) {
          showCombatHitImpactBundle({
            side: hitHudSide,
            amount: popAmount,
            mode,
            ...(hasTechnical
              ? {
                  technical: buildTechnicalImpactPayload({
                    amount,
                    ...(attackBreakdown
                      ? {
                          attackBreakdown,
                          ...(attackTotal !== undefined ? { attackTotal } : {}),
                        }
                      : {}),
                    ...(defenseBreakdown
                      ? {
                          defenseBreakdown,
                          ...(defenseTotal !== undefined ? { defenseTotal } : {}),
                        }
                      : {}),
                    ...(moveName ? { moveName } : {}),
                    ...(skillId ? { skillId } : {}),
                    ...(payload ? { damagePayload: payload } : {}),
                  }),
                }
              : {}),
          });
        }

        await hitCuePromise;
        return;
      }

      case 'heal_pop': {
        const portrait = screen?.getPortraitElement(step.combatantId);
        if (portrait && step.amount > 0) {
          const healSide = resolveBattleReceiverHudSide(step.combatantId);
          showBattleHitPop(healSide, step.amount, 'heal');
          showHealImpact(portrait, step.amount);
        }
        return;
      }

      case 'hp_animate': {
        const hpTargets = screen?.getHpBarTargets(step.combatantId);
        if (hpTargets) {
          await this.healthBar.animateTo(hpTargets, step.hpAfter, COMBAT_HP_ANIM_MS);
        }
        screen?.commitCombatantHp(step.combatantId, step.hpAfter);
        return;
      }

      default:
        return;
    }
  }

  /** Atualiza chips de escudo/defesa no portrait (snapshot autoritativo). */

  syncPortraitOverlays(combatantId: string, combatant: import('../../shared/types.js').Combatant): void {

    const screen = this.getBattleScreen();

    const portrait = screen?.getPortraitElement(combatantId);

    if (!portrait) return;

    syncPortraitOverlayChips(portrait, resolvePortraitOverlayChips(combatant));

  }

}


