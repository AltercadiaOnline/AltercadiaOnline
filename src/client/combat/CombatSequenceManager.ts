import type { CombatEvent } from '../../shared/events.js';
import { CombatEventType } from '../../shared/events.js';
import {
  COMBAT_DAMAGE_EVENT_GAP_MS,
  COMBAT_EVENT_GAP_MS,
  COMBAT_INSTANT_EVENT_GAP_MS,
} from '../../shared/combat/combatSequenceConstants.js';
import { CombatAnimator } from './CombatAnimator.js';
import { isBattlePlaybackClosing } from './combatPlaybackState.js';

export type CombatEventConsumer = (event: CombatEvent) => void;

export type CombatEventAnimator = (event: CombatEvent) => Promise<void>;

export type CombatSequenceManagerOptions = {
  readonly gapMs?: number;
  readonly consume?: CombatEventConsumer;
  readonly playAnimation?: CombatEventAnimator;
  readonly animator?: CombatAnimator;
};

function resolveGapAfterEvent(event: CombatEvent, defaultGapMs: number): number {
  switch (event.type) {
    case CombatEventType.BATTLE_START:
    case CombatEventType.BATTLE_STATE_UPDATE:
    case CombatEventType.TURN_START:
    case CombatEventType.SKILL_CATALOG:
    case CombatEventType.ACTION_ACCEPTED:
    case CombatEventType.ACTION_REJECTED:
    case CombatEventType.PP_CHANGED:
    case CombatEventType.COOLDOWN_UPDATED:
    case CombatEventType.COMBAT_FINISHED:
    case CombatEventType.TURN_RESOLVED:
    case CombatEventType.TURN_ORDER_RESOLVED:
    case CombatEventType.TURN_START:
    case CombatEventType.SKILL_USED:
    case CombatEventType.STATUS_EVENT:
      return COMBAT_INSTANT_EVENT_GAP_MS;
    case CombatEventType.DAMAGE_DEALT:
      return COMBAT_DAMAGE_EVENT_GAP_MS;
    default:
      return defaultGapMs;
  }
}

/**
 * Adapta CombatEvent[] para a fila genérica do CombatAnimator.
 * Cada evento: animação visual → consume na HUD → gap opcional.
 */
export class CombatSequenceManager {
  private readonly gapMs: number;
  private readonly consume: CombatEventConsumer;
  private readonly playAnimation: CombatEventAnimator;
  private readonly animator: CombatAnimator;

  constructor(options: CombatSequenceManagerOptions = {}) {
    this.gapMs = options.gapMs ?? COMBAT_EVENT_GAP_MS;
    this.consume = options.consume ?? (() => {});
    this.playAnimation = options.playAnimation ?? (async () => {});
    this.animator = options.animator ?? new CombatAnimator();
  }

  get processing(): boolean {
    return this.animator.processing;
  }

  async push(event: CombatEvent): Promise<void> {
    await this.animator.enqueue(() => this.runEvent(event, false));
  }

  async pushAll(events: readonly CombatEvent[]): Promise<void> {
    if (events.length === 0) return;
    const actions = events.map((event, index) => {
      const hasMore = index < events.length - 1;
      return () => this.runEvent(event, hasMore);
    });
    await this.animator.enqueueMany(actions);
  }

  whenIdle(): Promise<void> {
    return this.animator.whenIdle();
  }

  clear(): void {
    this.animator.clear();
  }

  private async runEvent(event: CombatEvent, hasMore: boolean): Promise<void> {
    await this.playAnimation(event);
    this.consume(event);
    if (!hasMore) return;
    let gap = resolveGapAfterEvent(event, this.gapMs);
    if (isBattlePlaybackClosing() && event.type === CombatEventType.COMBAT_LOG) {
      gap = COMBAT_INSTANT_EVENT_GAP_MS;
    }
    if (gap > 0) {
      await CombatAnimator.wait(gap);
    }
  }
}
