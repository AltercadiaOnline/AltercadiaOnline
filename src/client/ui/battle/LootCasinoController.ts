import type { LootRevealSlot } from '../../../shared/loot/lootRevealSlots.js';
import { mountLootCasinoSpin, type LootCasinoSpinController } from './LootCasinoSpin.js';

export type LootCasinoPhase = 'idle' | 'lever_pull' | 'spinning' | 'ready';

export type LootCasinoControllerOptions = {
  readonly slots: readonly LootRevealSlot[];
  readonly spinHost: HTMLElement;
  readonly pullLever: () => Promise<void>;
  readonly onPhaseChange?: (phase: LootCasinoPhase) => void;
  readonly onReady?: () => void;
};

export type LootCasinoController = {
  readonly getPhase: () => LootCasinoPhase;
  readonly isAnimating: () => boolean;
  /** PuxarAlavanca → await animação → rollSlots → await giro → habilita botões. */
  readonly runLootSequence: () => Promise<void>;
  readonly destroy: () => void;
};

/**
 * Orquestra a sequência estrita do cassino de loot pós-batalha.
 * Promises garantem ordem: alavanca → slots → UI liberada.
 */
export function createLootCasinoController(
  options: LootCasinoControllerOptions,
): LootCasinoController {
  let phase: LootCasinoPhase = 'idle';
  let sequenceInFlight = false;
  let spinController: LootCasinoSpinController | null = null;

  const setPhase = (next: LootCasinoPhase): void => {
    phase = next;
    options.onPhaseChange?.(next);
  };

  spinController = mountLootCasinoSpin({
    slots: options.slots,
    mountRoot: options.spinHost,
  });

  const runLootSequence = async (): Promise<void> => {
    if (phase !== 'idle' || sequenceInFlight) return;

    sequenceInFlight = true;
    try {
      setPhase('lever_pull');
      await options.pullLever();

      setPhase('spinning');
      await spinController!.rollSlots();

      setPhase('ready');
      options.onReady?.();
    } catch (error) {
      setPhase('idle');
      throw error;
    } finally {
      sequenceInFlight = false;
    }
  };

  return {
    getPhase: () => phase,
    isAnimating: () => phase === 'lever_pull' || phase === 'spinning',
    runLootSequence,
    destroy: () => {
      spinController?.destroy();
      spinController = null;
    },
  };
}
