import type { PlayerWorldVitals } from '../../shared/character/equipmentState.js';
import {
  applyCityRestRegen,
  EMPTY_CITY_REST_REGEN_CARRY,
  isCityRestRegenMap,
  type CityRestRegenCarry,
} from '../../shared/character/cityRestRegen.js';
import { EconomyEventType } from '../../shared/economy/events.js';
import { globalEventBus } from '../../Economy/EventBus.js';
import { touchCharacterPersistenceDirty } from '../persistence/PersistenceGateway.js';
import { getWorldProfile, saveWorldProfile } from './worldProfileStore.js';
import { syncWorldVitalsHpMaxFromLoadout } from './syncWorldVitalsHpMaxFromLoadout.js';

const carryByKey = new Map<string, CityRestRegenCarry>();

function key(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function resolveVitals(playerId: string, characterId: number): PlayerWorldVitals {
  const existing = getWorldProfile(playerId, characterId).sessionSync?.worldVitals;
  if (
    existing
    && Number.isFinite(existing.hpMax)
    && existing.hpMax >= 1
    && Number.isFinite(existing.mpMax)
    && existing.mpMax >= 1
  ) {
    return existing;
  }
  return syncWorldVitalsHpMaxFromLoadout(playerId, characterId);
}

/**
 * Tick de descanso na cidade — parado + city_01.
 * Sai da cidade / anda: pausa (mantém HP/MP e fração).
 */
export function tickCityRestRegen(input: {
  readonly playerId: string;
  readonly characterId: number;
  readonly mapId: string;
  readonly standingStill: boolean;
  readonly elapsedMs: number;
}): PlayerWorldVitals | null {
  const { playerId, characterId, mapId, standingStill, elapsedMs } = input;
  const mapKey = key(playerId, characterId);
  const inCity = isCityRestRegenMap(mapId);
  const active = inCity && standingStill;
  const carry = carryByKey.get(mapKey) ?? EMPTY_CITY_REST_REGEN_CARRY;
  const current = resolveVitals(playerId, characterId);

  const result = applyCityRestRegen({
    vitals: current,
    elapsedMs,
    carry,
    active,
  });

  carryByKey.set(mapKey, result.carry);

  if (!result.changed) {
    return null;
  }

  const profile = getWorldProfile(playerId, characterId);
  saveWorldProfile(playerId, characterId, {
    ...profile,
    sessionSync: {
      ...profile.sessionSync,
      worldVitals: result.vitals,
    },
  });
  touchCharacterPersistenceDirty(playerId, characterId, 'world');
  globalEventBus.emit({
    type: EconomyEventType.WorldVitalsUpdated,
    payload: {
      playerId,
      characterId,
      vitals: result.vitals,
      message: '',
      revision: Date.now(),
    },
  });

  return result.vitals;
}

export function clearCityRestRegenCarry(playerId: string, characterId: number): void {
  carryByKey.delete(key(playerId, characterId));
}

/** Testes. */
export function resetCityRestRegenCarryStore(): void {
  carryByKey.clear();
}
