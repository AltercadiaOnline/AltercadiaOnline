import { CombatEventType, type CombatEvent } from '../../shared/events.js';
import type { MarcoProgressEvent } from '../../shared/progression/marcoProgressEngine.js';
import { MarcoCombatTelemetryAccumulator } from '../../shared/progression/marcoCombatTelemetryCore.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { canApplyLocalGameplayMutations } from '../sync/intentPolicy.js';

/**
 * Acumula telemetria de combate no cliente e envia intenções PROGRESS_MARCO
 * após a batalha — apenas em mock/local. Online: servidor aplica no fim da batalha.
 */
class MarcoCombatTelemetry {
  private readonly accumulator = new MarcoCombatTelemetryAccumulator();

  reset(): void {
    this.accumulator.reset();
  }

  recordCombatEvent(event: CombatEvent): void {
    this.accumulator.recordCombatEvent(event);
  }

  flushAfterBattle(victory: boolean): void {
    if (!canApplyLocalGameplayMutations(getActionDispatcher().getMode())) {
      this.reset();
      return;
    }

    const events = this.accumulator.toProgressEvents(victory);
    this.reset();

    if (events.length === 0) return;

    getActionDispatcher().dispatch({
      type: 'PROGRESS_MARCO',
      payload: { events },
    });
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

export type { MarcoProgressEvent };
