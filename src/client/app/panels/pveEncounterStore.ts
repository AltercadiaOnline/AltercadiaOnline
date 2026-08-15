/**
 * Espelho do encontro PVE no mundo — servidor envia offer/clear; UI só reage.
 */

import type {
  PveEncounterClearPayload,
  PveEncounterFleeResultPayload,
  PveEncounterOfferPayload,
} from '../../../shared/world/pveEncounterProtocol.js';

export type PveEncounterSnapshot = {
  readonly offer: PveEncounterOfferPayload | null;
  readonly busy: boolean;
  readonly lastFleeMessage: string | null;
};

type Listener = (snapshot: PveEncounterSnapshot) => void;

function emptySnapshot(): PveEncounterSnapshot {
  return { offer: null, busy: false, lastFleeMessage: null };
}

class PveEncounterStore {
  private snapshot: PveEncounterSnapshot = emptySnapshot();
  private readonly listeners = new Set<Listener>();

  getSnapshot(): PveEncounterSnapshot {
    return this.snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  applyOffer(payload: PveEncounterOfferPayload): void {
    this.snapshot = {
      offer: payload,
      busy: false,
      lastFleeMessage: null,
    };
    this.emit();
  }

  applyClear(payload: PveEncounterClearPayload): void {
    if (
      this.snapshot.offer
      && this.snapshot.offer.monsterInstanceId !== payload.monsterInstanceId
    ) {
      return;
    }

    let toast: string | null = this.snapshot.lastFleeMessage;
    if (payload.reason === 'expired' || payload.reason === 'cancelled') {
      toast = 'Encontro ignorado. O próximo será combate obrigatório.';
    } else if (payload.reason === 'moved_away') {
      toast = 'Você se afastou. O próximo encontro será combate obrigatório.';
    }

    this.snapshot = {
      offer: null,
      busy: false,
      lastFleeMessage: toast,
    };
    this.emit();
  }

  applyFleeResult(payload: PveEncounterFleeResultPayload): void {
    this.snapshot = {
      ...this.snapshot,
      busy: false,
      lastFleeMessage: payload.message,
    };
    this.emit();
  }

  clearFleeToast(expectedMessage?: string): void {
    if (expectedMessage && this.snapshot.lastFleeMessage !== expectedMessage) return;
    if (!this.snapshot.lastFleeMessage) return;
    this.snapshot = { ...this.snapshot, lastFleeMessage: null };
    this.emit();
  }

  setBusy(busy: boolean): void {
    if (this.snapshot.busy === busy) return;
    this.snapshot = { ...this.snapshot, busy };
    this.emit();
  }

  /** Toast curto no mundo (join falhou / timeout) — sem modal. */
  showTransientToast(message: string): void {
    const text = message.trim();
    if (!text) return;
    this.snapshot = {
      ...this.snapshot,
      busy: false,
      lastFleeMessage: text,
    };
    this.emit();
  }

  reset(): void {
    this.snapshot = emptySnapshot();
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

type GlobalWithPveEncounter = typeof globalThis & {
  __ALTERCADIA_PVE_ENCOUNTER_STORE__?: PveEncounterStore;
};

export function getPveEncounterStore(): PveEncounterStore {
  const g = globalThis as GlobalWithPveEncounter;
  if (!g.__ALTERCADIA_PVE_ENCOUNTER_STORE__) {
    g.__ALTERCADIA_PVE_ENCOUNTER_STORE__ = new PveEncounterStore();
  }
  return g.__ALTERCADIA_PVE_ENCOUNTER_STORE__;
}
