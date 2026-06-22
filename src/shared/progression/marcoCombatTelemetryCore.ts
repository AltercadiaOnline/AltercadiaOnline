import { CombatEventType, type CombatEvent } from '../events.js';
import { MarcoProgressTrigger, type MarcoProgressTriggerId } from '../progression/marcoProgressCatalog.js';
import type { MarcoProgressEvent } from '../progression/marcoProgressEngine.js';
import { isFluxAlignedMove } from '../combat/resolveMoveCombatMeta.js';

type TriggerCounts = Record<string, number>;

/** Acumula gatilhos Marcos a partir de eventos de combate — compartilhado cliente/servidor. */
export class MarcoCombatTelemetryAccumulator {
  private counts: TriggerCounts = {};
  private playerActorId: string | null = null;

  constructor(playerActorId?: string | null) {
    this.playerActorId = playerActorId ?? null;
  }

  reset(): void {
    this.counts = {};
    this.playerActorId = null;
  }

  setPlayerActorId(actorId: string | null): void {
    this.playerActorId = actorId;
  }

  private bump(trigger: MarcoProgressTriggerId): void {
    this.counts[trigger] = (this.counts[trigger] ?? 0) + 1;
  }

  recordCombatEvent(event: CombatEvent): void {
    switch (event.type) {
      case CombatEventType.BATTLE_START: {
        const combatants = event.payload.combatants;
        const playerEntry = Object.keys(combatants).find((id) => id.includes('player'));
        this.playerActorId = playerEntry ?? Object.keys(combatants)[0] ?? null;
        break;
      }
      case CombatEventType.DAMAGE_DEALT: {
        const { sourceId, targetId, amount, isCritical } = event.payload;
        if (amount <= 0) return;

        if (sourceId === this.playerActorId) {
          this.bump(MarcoProgressTrigger.DAMAGE_DEALT);
          if (isCritical) this.bump(MarcoProgressTrigger.CRIT_LANDED);
        }
        if (targetId === this.playerActorId) {
          this.bump(MarcoProgressTrigger.DAMAGE_TAKEN);
        }
        break;
      }
      case CombatEventType.ACTION_ACCEPTED: {
        if (event.payload.actorId !== this.playerActorId) break;
        const moveId = event.payload.skillId;
        if (moveId && isFluxAlignedMove(moveId)) {
          this.bump(MarcoProgressTrigger.FLUX_MOVE_USED);
        }
        break;
      }
      default:
        break;
    }
  }

  recordCombatEvents(events: readonly CombatEvent[]): void {
    for (const event of events) {
      this.recordCombatEvent(event);
    }
  }

  toProgressEvents(victory: boolean): MarcoProgressEvent[] {
    if (victory) {
      this.bump(MarcoProgressTrigger.BATTLE_WON);
    }

    return Object.entries(this.counts)
      .filter(([, count]) => count > 0)
      .map(([trigger, count]) => ({
        trigger: trigger as MarcoProgressEvent['trigger'],
        count,
      }));
  }
}
