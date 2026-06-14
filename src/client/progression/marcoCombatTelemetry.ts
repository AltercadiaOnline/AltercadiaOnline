import { CombatEventType, type CombatEvent } from '../../shared/events.js';
import { MarcoProgressTrigger } from '../../shared/progression/marcoProgressCatalog.js';
import type { MarcoProgressEvent } from '../../shared/progression/marcoProgressEngine.js';
import { isFluxAlignedMove } from '../../shared/combat/resolveMoveCombatMeta.js';
import { getActionDispatcher } from '../ActionDispatcher.js';

type TriggerCounts = Record<string, number>;

/**
 * Acumula telemetria de combate no cliente e envia intenções PROGRESS_MARCO
 * após a batalha — servidor (mock/supabase) valida e aplica XP.
 */
class MarcoCombatTelemetry {
  private counts: TriggerCounts = {};
  private playerActorId: string | null = null;

  reset(): void {
    this.counts = {};
    this.playerActorId = null;
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

  flushAfterBattle(victory: boolean): void {
    if (victory) {
      this.bump(MarcoProgressTrigger.BATTLE_WON);
    }

    const events = this.toProgressEvents();
    this.reset();

    if (events.length === 0) return;

    getActionDispatcher().dispatch({
      type: 'PROGRESS_MARCO',
      payload: { events },
    });
  }

  private bump(trigger: string): void {
    this.counts[trigger] = (this.counts[trigger] ?? 0) + 1;
  }

  private toProgressEvents(): MarcoProgressEvent[] {
    return Object.entries(this.counts)
      .filter(([, count]) => count > 0)
      .map(([trigger, count]) => ({
        trigger: trigger as MarcoProgressEvent['trigger'],
        count,
      }));
  }
}

let telemetry: MarcoCombatTelemetry | null = null;

export function getMarcoCombatTelemetry(): MarcoCombatTelemetry {
  if (!telemetry) telemetry = new MarcoCombatTelemetry();
  return telemetry;
}

export function resetMarcoCombatTelemetry(): void {
  telemetry = null;
}
