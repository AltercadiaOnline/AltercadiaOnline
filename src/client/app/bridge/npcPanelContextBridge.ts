// @ts-nocheck
const DEFAULT_SNAPSHOT = {
    vendorShop: null,
    vendorShopTick: 0,
    laboratoryShop: null,
    laboratoryShopTick: 0,
    petTrainerShop: null,
    petTrainerShopTick: 0,
    craftStation: null,
    craftStationTick: 0,
    tournamentBet: null,
    tournamentBetTick: 0,
    rankingMonitor: null,
    rankingMonitorTick: 0,
    refractionBooth: null,
    refractionBoothTick: 0,
    dialogue: null,
    dialogueTick: 0,
};
class NpcPanelContextBridge {
    snapshotState = DEFAULT_SNAPSHOT;
    listeners = new Set();
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.snapshotState);
        return () => this.listeners.delete(listener);
    }
    snapshot() {
        return this.snapshotState;
    }
    setVendorShopContext(context) {
        this.snapshotState = {
            ...this.snapshotState,
            vendorShop: { ...context },
            vendorShopTick: this.snapshotState.vendorShopTick + 1,
        };
        this.emit();
    }
    setLaboratoryShopContext(context) {
        this.snapshotState = {
            ...this.snapshotState,
            laboratoryShop: { ...context },
            laboratoryShopTick: this.snapshotState.laboratoryShopTick + 1,
        };
        this.emit();
    }
    setPetTrainerShopContext(context) {
        this.snapshotState = {
            ...this.snapshotState,
            petTrainerShop: { ...context },
            petTrainerShopTick: this.snapshotState.petTrainerShopTick + 1,
        };
        this.emit();
    }
    setCraftStationContext(context) {
        this.snapshotState = {
            ...this.snapshotState,
            craftStation: { ...context },
            craftStationTick: this.snapshotState.craftStationTick + 1,
        };
        this.emit();
    }
    setTournamentBetContext(context) {
        this.snapshotState = {
            ...this.snapshotState,
            tournamentBet: { ...context },
            tournamentBetTick: this.snapshotState.tournamentBetTick + 1,
        };
        this.emit();
    }
    setRankingMonitorContext(context) {
        this.snapshotState = {
            ...this.snapshotState,
            rankingMonitor: { ...context },
            rankingMonitorTick: this.snapshotState.rankingMonitorTick + 1,
        };
        this.emit();
    }
    setRefractionBoothContext(context) {
        this.snapshotState = {
            ...this.snapshotState,
            refractionBooth: { ...context },
            refractionBoothTick: this.snapshotState.refractionBoothTick + 1,
        };
        this.emit();
    }
    setDialogueContext(context) {
        this.snapshotState = {
            ...this.snapshotState,
            dialogue: { ...context },
            dialogueTick: this.snapshotState.dialogueTick + 1,
        };
        this.emit();
    }
    resetSession() {
        this.snapshotState = DEFAULT_SNAPSHOT;
        this.emit();
    }
    emit() {
        for (const listener of this.listeners) {
            listener(this.snapshotState);
        }
    }
}
export function getNpcPanelContextBridge() {
    const globalBridge = globalThis;
    if (!globalBridge.__ALTERCADIA_NPC_PANEL_CONTEXT_BRIDGE__) {
        globalBridge.__ALTERCADIA_NPC_PANEL_CONTEXT_BRIDGE__ = new NpcPanelContextBridge();
    }
    return globalBridge.__ALTERCADIA_NPC_PANEL_CONTEXT_BRIDGE__;
}
