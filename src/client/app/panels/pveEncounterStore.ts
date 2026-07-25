// @ts-nocheck
/**
 * Espelho do encontro PVE no mundo — servidor envia offer/clear; UI só reage.
 */
function emptySnapshot() {
    return { offer: null, busy: false, lastFleeMessage: null };
}
class PveEncounterStore {
    snapshot = emptySnapshot();
    listeners = new Set();
    getSnapshot() {
        return this.snapshot;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    applyOffer(payload) {
        this.snapshot = {
            offer: payload,
            busy: false,
            lastFleeMessage: null,
        };
        this.emit();
    }
    applyClear(payload) {
        if (this.snapshot.offer
            && this.snapshot.offer.monsterInstanceId !== payload.monsterInstanceId) {
            return;
        }
        let toast = this.snapshot.lastFleeMessage;
        if (payload.reason === 'expired' || payload.reason === 'cancelled') {
            toast = 'Encontro ignorado. O próximo será combate obrigatório.';
        }
        else if (payload.reason === 'moved_away') {
            toast = 'Você se afastou. O próximo encontro será combate obrigatório.';
        }
        this.snapshot = {
            offer: null,
            busy: false,
            lastFleeMessage: toast,
        };
        this.emit();
    }
    applyFleeResult(payload) {
        this.snapshot = {
            ...this.snapshot,
            busy: false,
            lastFleeMessage: payload.message,
        };
        this.emit();
    }
    clearFleeToast(expectedMessage) {
        if (expectedMessage && this.snapshot.lastFleeMessage !== expectedMessage)
            return;
        if (!this.snapshot.lastFleeMessage)
            return;
        this.snapshot = { ...this.snapshot, lastFleeMessage: null };
        this.emit();
    }
    setBusy(busy) {
        if (this.snapshot.busy === busy)
            return;
        this.snapshot = { ...this.snapshot, busy };
        this.emit();
    }
    reset() {
        this.snapshot = emptySnapshot();
        this.emit();
    }
    emit() {
        for (const listener of this.listeners) {
            listener(this.snapshot);
        }
    }
}
export function getPveEncounterStore() {
    const g = globalThis;
    if (!g.__ALTERCADIA_PVE_ENCOUNTER_STORE__) {
        g.__ALTERCADIA_PVE_ENCOUNTER_STORE__ = new PveEncounterStore();
    }
    return g.__ALTERCADIA_PVE_ENCOUNTER_STORE__;
}
