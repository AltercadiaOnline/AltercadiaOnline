import type { PlayerWorldVitals } from './equipmentState.js';
import { CITY_01_ID } from '../world/maps/city01.js';

/**
 * Descanso na cidade — HP/MP sobem sozinhos parado.
 * Âncora: ~99 pontos em 60s (1→100). Taxa flat → teto maior demora mais.
 */
export const CITY_REST_REGEN_MAP_ID = CITY_01_ID;
export const CITY_REST_FULL_REF_POINTS = 99;
export const CITY_REST_FULL_REF_MS = 60_000;
export const CITY_REST_REGEN_PER_SEC =
  CITY_REST_FULL_REF_POINTS / (CITY_REST_FULL_REF_MS / 1000);

export type CityRestRegenCarry = {
  readonly hpFrac: number;
  readonly mpFrac: number;
};

export const EMPTY_CITY_REST_REGEN_CARRY: CityRestRegenCarry = {
  hpFrac: 0,
  mpFrac: 0,
};

export type CityRestRegenInput = {
  readonly vitals: PlayerWorldVitals;
  readonly elapsedMs: number;
  readonly carry?: CityRestRegenCarry;
  /** Só regenera se true (parado na cidade). */
  readonly active: boolean;
};

export type CityRestRegenResult = {
  readonly vitals: PlayerWorldVitals;
  readonly carry: CityRestRegenCarry;
  /** Inteiros de HP/MP mudaram — emite sync. */
  readonly changed: boolean;
};

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function sanitizeCarry(carry: CityRestRegenCarry | undefined): CityRestRegenCarry {
  const hpFrac = typeof carry?.hpFrac === 'number' && Number.isFinite(carry.hpFrac)
    ? Math.max(0, carry.hpFrac)
    : 0;
  const mpFrac = typeof carry?.mpFrac === 'number' && Number.isFinite(carry.mpFrac)
    ? Math.max(0, carry.mpFrac)
    : 0;
  return { hpFrac, mpFrac };
}

function sanitizeVitals(vitals: PlayerWorldVitals): PlayerWorldVitals {
  const hpMax = Math.max(1, Math.floor(vitals.hpMax));
  const mpMax = Math.max(1, Math.floor(vitals.mpMax));
  return {
    hpMax,
    mpMax,
    hpCurrent: clampInt(vitals.hpCurrent, 0, hpMax),
    mpCurrent: clampInt(vitals.mpCurrent, 0, mpMax),
  };
}

/**
 * Aplica regen de descanso. Com `active=false` (andando / fora da cidade)
 * mantém vitals e carry — retoma do mesmo ponto ao parar de novo.
 */
export function applyCityRestRegen(input: CityRestRegenInput): CityRestRegenResult {
  const vitals = sanitizeVitals(input.vitals);
  const carry = sanitizeCarry(input.carry);

  if (!input.active) {
    return { vitals, carry, changed: false };
  }

  const needsHp = vitals.hpCurrent < vitals.hpMax;
  const needsMp = vitals.mpCurrent < vitals.mpMax;
  if (!needsHp && !needsMp) {
    return { vitals, carry: EMPTY_CITY_REST_REGEN_CARRY, changed: false };
  }

  const elapsedMs = Math.max(0, input.elapsedMs);
  if (elapsedMs <= 0) {
    return { vitals, carry, changed: false };
  }

  const gain = CITY_REST_REGEN_PER_SEC * (elapsedMs / 1000);
  let hpFrac = carry.hpFrac;
  let mpFrac = carry.mpFrac;
  let hpCurrent = vitals.hpCurrent;
  let mpCurrent = vitals.mpCurrent;

  if (needsHp) {
    hpFrac += gain;
    const whole = Math.floor(hpFrac);
    if (whole > 0) {
      hpCurrent = clampInt(hpCurrent + whole, 0, vitals.hpMax);
      hpFrac -= whole;
    }
    if (hpCurrent >= vitals.hpMax) {
      hpCurrent = vitals.hpMax;
      hpFrac = 0;
    }
  } else {
    hpFrac = 0;
  }

  if (needsMp) {
    mpFrac += gain;
    const whole = Math.floor(mpFrac);
    if (whole > 0) {
      mpCurrent = clampInt(mpCurrent + whole, 0, vitals.mpMax);
      mpFrac -= whole;
    }
    if (mpCurrent >= vitals.mpMax) {
      mpCurrent = vitals.mpMax;
      mpFrac = 0;
    }
  } else {
    mpFrac = 0;
  }

  const next: PlayerWorldVitals = {
    hpCurrent,
    hpMax: vitals.hpMax,
    mpCurrent,
    mpMax: vitals.mpMax,
  };

  return {
    vitals: next,
    carry: { hpFrac, mpFrac },
    changed: next.hpCurrent !== vitals.hpCurrent || next.mpCurrent !== vitals.mpCurrent,
  };
}

export function isCityRestRegenMap(mapId: string | null | undefined): boolean {
  return mapId === CITY_REST_REGEN_MAP_ID;
}
