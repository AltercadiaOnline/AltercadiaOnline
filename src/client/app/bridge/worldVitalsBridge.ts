/**
 * SSOT de vitals de mundo entre bundles (dist/client × app-ui).
 * Mesmo padrão de `hudBridge` — evita HUD em 100/100 enquanto o servidor tem 0.
 */

import type { PlayerWorldVitals } from '../../../shared/character/equipmentState.js';

export type WorldVitalsBridgeSnapshot = {
  readonly vitals: PlayerWorldVitals;
  readonly revision: number;
};

type WorldVitalsListener = (snapshot: WorldVitalsBridgeSnapshot) => void;

const DEFAULT_VITALS: PlayerWorldVitals = {
  hpCurrent: 100,
  hpMax: 100,
  mpCurrent: 40,
  mpMax: 40,
};

class WorldVitalsBridge {
  private vitals: PlayerWorldVitals = { ...DEFAULT_VITALS };
  private revision = 0;
  private readonly listeners = new Set<WorldVitalsListener>();

  subscribe(listener: WorldVitalsListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): WorldVitalsBridgeSnapshot {
    return { vitals: { ...this.vitals }, revision: this.revision };
  }

  /** Autoritativo — combate, cura NPC, full-state. */
  apply(vitals: Partial<PlayerWorldVitals>): WorldVitalsBridgeSnapshot {
    const hpMax = Math.max(1, vitals.hpMax ?? this.vitals.hpMax);
    const mpMax = Math.max(0, vitals.mpMax ?? this.vitals.mpMax);
    const next: PlayerWorldVitals = {
      hpMax,
      mpMax,
      hpCurrent: Math.max(0, Math.min(vitals.hpCurrent ?? this.vitals.hpCurrent, hpMax)),
      mpCurrent: Math.max(0, Math.min(vitals.mpCurrent ?? this.vitals.mpCurrent, mpMax)),
    };

    if (
      next.hpCurrent === this.vitals.hpCurrent
      && next.hpMax === this.vitals.hpMax
      && next.mpCurrent === this.vitals.mpCurrent
      && next.mpMax === this.vitals.mpMax
    ) {
      return this.snapshot();
    }

    this.vitals = next;
    this.revision += 1;
    const snap = this.snapshot();
    for (const listener of this.listeners) listener(snap);
    return snap;
  }

  resetSession(): void {
    this.vitals = { ...DEFAULT_VITALS };
    this.revision += 1;
    const snap = this.snapshot();
    for (const listener of this.listeners) listener(snap);
  }
}

type GlobalWithWorldVitalsBridge = typeof globalThis & {
  __ALTERCADIA_WORLD_VITALS_BRIDGE__?: WorldVitalsBridge;
};

export function getWorldVitalsBridge(): WorldVitalsBridge {
  const globalBridge = globalThis as GlobalWithWorldVitalsBridge;
  if (!globalBridge.__ALTERCADIA_WORLD_VITALS_BRIDGE__) {
    globalBridge.__ALTERCADIA_WORLD_VITALS_BRIDGE__ = new WorldVitalsBridge();
  }
  return globalBridge.__ALTERCADIA_WORLD_VITALS_BRIDGE__;
}
