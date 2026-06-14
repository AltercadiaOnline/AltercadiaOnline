import type { PetSnapshot } from '../../../shared/pet/petModel.js';
import type { PetCareStatus, PetState } from '../../../shared/pet/petState.js';
import {
  applyPetDirectFeed,
  applyPetCareItem,
  isPetLifeExpired,
  MAX_BIOLOGICAL_AGE,
  resolvePetAgeYears,
  resolvePetCareStatus,
  resolvePetState,
  sanitizePetCareFields,
} from '../../../shared/pet/petState.js';
import {
  removePetFromRoster,
  updatePetInRoster,
  type PlayerPetRosterSnapshot,
} from '../../../shared/pet/petRoster.js';
import { processPetDeathMemorial } from './petMemorialService.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

export type PetDeathEvent = {
  readonly instanceId: string;
  readonly name: string;
  readonly slotIndex: number;
  readonly ageMs: number;
  readonly biologicalAge: number;
  readonly petSnapshot: PetSnapshot;
  readonly deathDateMs: number;
};

export type PetRosterPersistence = {
  getRosterInternal(): PlayerPetRosterSnapshot;
  commitRoster(roster: PlayerPetRosterSnapshot): void;
  getSelectedSlotIndex(): number;
};

type PetDeathListener = (event: PetDeathEvent) => void;

export type ApplyPetCareResult =
  | {
    readonly ok: true;
    readonly status: PetCareStatus;
    readonly pet: PetSnapshot;
    readonly affinityGainRatio: number;
  }
  | { readonly ok: false; readonly reason: string };

/**
 * Ciclo de vida do pet — idade biológica (0–25 em 450 dias), fases, memorial e morte.
 */
class PetStateStore {
  private readonly deathListeners = new Set<PetDeathListener>();
  private syncing = false;
  private rosterPersistence: PetRosterPersistence | null = null;

  bindRosterPersistence(persistence: PetRosterPersistence): void {
    this.rosterPersistence = persistence;
  }

  onPetDeath(listener: PetDeathListener): () => void {
    this.deathListeners.add(listener);
    return () => this.deathListeners.delete(listener);
  }

  /** Idade biológica em anos (0–25). */
  getPetAgeYears(slotIndex?: number, now = Date.now()): number | null {
    return this.getPetAge(slotIndex, now);
  }

  getPetAge(slotIndex?: number, now = Date.now()): number | null {
    this.checkLifeExpiration(now);
    const pet = this.resolvePetAtSlot(slotIndex);
    if (!pet) return null;

    const care = sanitizePetCareFields(pet, now);
    return resolvePetAgeYears(care.birthDateMs, care.agingPauseMs, now);
  }

  getPetState(slotIndex?: number, now = Date.now()): PetState | null {
    this.checkLifeExpiration(now);
    const pet = this.resolvePetAtSlot(slotIndex);
    if (!pet) return null;
    return resolvePetState(pet, now);
  }

  getPetStatus(slotIndex?: number, now = Date.now()): PetCareStatus | null {
    const state = this.getPetState(slotIndex, now);
    return state?.status ?? null;
  }

  applyDirectFeed(slotIndex?: number, now = Date.now()): ApplyPetCareResult {
    this.checkLifeExpiration(now);

    const index = slotIndex ?? this.getPersistence().getSelectedSlotIndex();
    const roster = this.getPersistence().getRosterInternal();
    const pet = roster.pets[index];
    if (!pet) {
      return { ok: false, reason: 'Nenhum pet neste slot.' };
    }

    const result = applyPetDirectFeed(pet, now);
    if (!result.ok) return result;

    const nextRoster = updatePetInRoster(roster, index, result.pet);
    this.getPersistence().commitRoster(nextRoster);
    return {
      ok: true,
      status: result.status,
      pet: result.pet,
      affinityGainRatio: result.affinityGainRatio,
    };
  }

  /** @deprecated Use applyDirectFeed */
  applyCare(itemId: string, slotIndex?: number, now = Date.now()): ApplyPetCareResult {
    void itemId;
    return this.applyDirectFeed(slotIndex, now);
  }

  syncLifeExpiration(now = Date.now()): void {
    this.checkLifeExpiration(now);
  }

  private checkLifeExpiration(now = Date.now()): void {
    if (this.syncing) return;

    const persistence = this.getPersistence();
    let roster = persistence.getRosterInternal();
    if (roster.pets.length === 0) return;

    this.syncing = true;
    try {
      const deaths: PetDeathEvent[] = [];
      let changed = false;

      for (let slot = roster.pets.length - 1; slot >= 0; slot -= 1) {
        const pet = roster.pets[slot];
        if (!pet || !isPetLifeExpired(pet, now)) continue;

        const care = sanitizePetCareFields(pet, now);
        const biologicalAge = resolvePetAgeYears(care.birthDateMs, care.agingPauseMs, now);
        deaths.push({
          instanceId: care.instanceId,
          name: pet.name,
          slotIndex: slot,
          ageMs: Math.max(0, now - care.birthDateMs),
          biologicalAge,
          petSnapshot: { ...pet, ...care },
          deathDateMs: now,
        });

        const next = removePetFromRoster(roster, slot);
        if (!next) continue;
        roster = next;
        changed = true;
      }

      if (changed) {
        persistence.commitRoster(roster);
      }

      for (const event of deaths) {
        this.triggerPetDeath(event);
      }
    } finally {
      this.syncing = false;
    }
  }

  private triggerPetDeath(event: PetDeathEvent): void {
    processPetDeathMemorial(event.petSnapshot, event.deathDateMs);

    for (const listener of this.deathListeners) {
      listener(event);
    }
    uiEvents.emit(UIEventType.PET_LIFE_EXPIRED, event);
  }

  private resolvePetAtSlot(slotIndex?: number): PetSnapshot | null {
    const roster = this.getPersistence().getRosterInternal();
    const index = slotIndex ?? this.getPersistence().getSelectedSlotIndex();
    return roster.pets[index] ?? null;
  }

  private getPersistence(): PetRosterPersistence {
    if (!this.rosterPersistence) {
      throw new Error('[PetStateStore] Roster persistence not bound.');
    }
    return this.rosterPersistence;
  }
}

let store: PetStateStore | null = null;

export function getPetStateStore(): PetStateStore {
  if (!store) {
    store = new PetStateStore();
  }
  return store;
}

export function resetPetStateStore(): void {
  store = null;
}

export { MAX_BIOLOGICAL_AGE };
