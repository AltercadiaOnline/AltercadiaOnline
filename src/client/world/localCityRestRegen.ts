/**
 * Regen de descanso na cidade — só GAME_MODE local (mock).
 * Online: servidor `cityRestRegenTick` no GameLoop.
 */

import {
  applyCityRestRegen,
  EMPTY_CITY_REST_REGEN_CARRY,
  isCityRestRegenMap,
  type CityRestRegenCarry,
} from '../../shared/character/cityRestRegen.js';
import { getMockEconomyService } from '../economy/economyLayer.js';
import { isLocalGameMode } from '../runtime/gameMode.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { applyAuthoritativeWorldVitals } from './applyAuthoritativeWorldVitals.js';

let carry: CityRestRegenCarry = EMPTY_CITY_REST_REGEN_CARRY;
let persistCooldownMs = 0;

export function resetLocalCityRestRegen(): void {
  carry = EMPTY_CITY_REST_REGEN_CARRY;
  persistCooldownMs = 0;
}

/** Chamado no update da Exploration — local + city_01 + parado. */
export function tickLocalCityRestRegen(input: {
  readonly mapId: string;
  readonly standingStill: boolean;
  readonly elapsedMs: number;
}): void {
  if (!isLocalGameMode()) return;

  const active = isCityRestRegenMap(input.mapId) && input.standingStill;
  const current = getGlobalPlayerStore().getWorldVitals();
  const result = applyCityRestRegen({
    vitals: current,
    elapsedMs: input.elapsedMs,
    carry,
    active,
  });
  carry = result.carry;

  if (!result.changed) {
    persistCooldownMs = Math.max(0, persistCooldownMs - input.elapsedMs);
    return;
  }

  applyAuthoritativeWorldVitals(result.vitals);
  persistCooldownMs -= input.elapsedMs;
  if (persistCooldownMs <= 0) {
    persistCooldownMs = 2_000;
    getMockEconomyService()?.persistLocalSave();
  }
}
