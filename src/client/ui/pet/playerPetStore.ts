import type { PetSnapshot } from '../../../shared/pet/petModel.js';
import { canPetEnterBattle } from '../../../shared/pet/petModel.js';
import { createPetSnapshot, type PetKindId } from '../../../shared/pet/petCatalog.js';
import type { PetColorId } from '../../../shared/pet/petColorPalette.js';
import type { PetGenderId } from '../../../shared/pet/petGender.js';
import { sanitizePetGenderId } from '../../../shared/pet/petGender.js';
import { revivePet } from '../../../shared/pet/petRevival.js';
import { applyPetAffinityXp } from '../../../shared/pet/petAffinity.js';
import { PET_AFFINITY_CONFIG } from '../../../shared/pet/petAffinityConfig.js';
import {
  PET_AFFECTION_CONFIG,
  resolvePetAffectionAvailability,
  type PetAffectionAvailability,
} from '../../../shared/pet/petAffection.js';
import {
  resolvePetRationFeedAvailability,
  type PetRationFeedAvailability,
} from '../../../shared/pet/petRationFeed.js';
import { applyPetCare } from '../../../shared/pet/petState.js';
import {
  activatePetSlot,
  appendPetToRoster,
  canAdoptMorePets,
  createEmptyPetRoster,
  deactivateAllPetSlots,
  resolveSelectedPet,
  resolveSummonedPet,
  selectPetSlot,
  updatePetInRoster,
  type PlayerPetRosterSnapshot,
} from '../../../shared/pet/petRoster.js';
import type { PetAffinityStateSnapshot, PetRosterDataSnapshot } from '../../../shared/playerDataSnapshots.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import { getPetStateStore, resetPetStateStore } from './PetStateStore.js';
import {
  initPetInheritanceBridge,
  initPetMemorialNotificationBridge,
} from './petInheritanceBridge.js';

const ROSTER_STORAGE_KEY = 'altercadia.playerPetRoster.v1';
const LEGACY_PET_STORAGE_KEY = 'altercadia.playerPet.v1';
const AFFECTION_COOLDOWN_KEY = 'altercadia.petAffectionCooldown.v1';
const RATION_FEED_COOLDOWN_KEY = 'altercadia.petRationFeedCooldown.v1';
const RATION_CHARGES_STORAGE_KEY = 'altercadia.petRationCharges.v1';

type Listener = (pet: PetSnapshot | null) => void;
type RosterListener = (roster: PlayerPetRosterSnapshot) => void;
type RationChargesListener = (charges: number) => void;

export type AuthoritativePetStatePayload = {
  readonly roster: PlayerPetRosterSnapshot;
  readonly affinity: Omit<PetAffinityStateSnapshot, 'revision'>;
};

const ONLINE_PET_MUTATION_MESSAGE =
  'Alteração de pet bloqueada em modo online — aguarde confirmação do servidor.';

function isOnlinePetMode(): boolean {
  return getActionDispatcher().getMode() === 'online';
}

/** Bloqueia mutações locais quando o servidor é a fonte da verdade (sem log — evita spam por frame). */
function blockLocalPetMutation(): boolean {
  return isOnlinePetMode();
}

function shouldPersistPetLocally(): boolean {
  return !isOnlinePetMode();
}
function saveRosterToStorage(roster: PlayerPetRosterSnapshot): void {
  if (!shouldPersistPetLocally()) return;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
    localStorage.removeItem(LEGACY_PET_STORAGE_KEY);
  } catch {
    /* quota / private mode */
  }
}

function readLastPetAffectionAtFromStorage(): number | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AFFECTION_COOLDOWN_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
  } catch {
    return null;
  }
}

function saveLastPetAffectionAtToStorage(timestampMs: number): void {
  if (!shouldPersistPetLocally()) return;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(AFFECTION_COOLDOWN_KEY, String(Math.floor(timestampMs)));
  } catch {
    /* quota */
  }
}

function clearLastPetAffectionAtFromStorage(): void {
  if (!shouldPersistPetLocally()) return;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(AFFECTION_COOLDOWN_KEY);
  } catch {
    /* ignore */
  }
}

function readLastPetRationFeedAtFromStorage(): number | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RATION_FEED_COOLDOWN_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
  } catch {
    return null;
  }
}

function saveLastPetRationFeedAtToStorage(timestampMs: number): void {
  if (!shouldPersistPetLocally()) return;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(RATION_FEED_COOLDOWN_KEY, String(Math.floor(timestampMs)));
  } catch {
    /* quota */
  }
}

function clearLastPetRationFeedAtFromStorage(): void {
  if (!shouldPersistPetLocally()) return;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(RATION_FEED_COOLDOWN_KEY);
  } catch {
    /* ignore */
  }
}

function readRationChargesFromStorage(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(RATION_CHARGES_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

function saveRationChargesToStorage(charges: number): void {
  if (!shouldPersistPetLocally()) return;
  if (typeof localStorage === 'undefined') return;
  try {
    const normalized = Math.max(0, Math.floor(charges));
    if (normalized <= 0) {
      localStorage.removeItem(RATION_CHARGES_STORAGE_KEY);
      return;
    }
    localStorage.setItem(RATION_CHARGES_STORAGE_KEY, String(normalized));
  } catch {
    /* quota */
  }
}

function clearRationChargesFromStorage(): void {
  if (!shouldPersistPetLocally()) return;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(RATION_CHARGES_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function hydratePetFromPartial(parsed: Partial<PetSnapshot>, kindId: PetKindId): PetSnapshot {
  const options: { name?: string; colorId?: PetColorId; gender?: PetGenderId } = {};
  if (typeof parsed.name === 'string') options.name = parsed.name;
  if (typeof parsed.colorId === 'string') options.colorId = parsed.colorId as PetColorId;
  if (parsed.gender !== undefined) options.gender = sanitizePetGenderId(parsed.gender);
  const base = createPetSnapshot(kindId, options);
  const hpCurrent = typeof parsed.hpCurrent === 'number'
    ? Math.max(0, Math.min(base.hpMax, Math.floor(parsed.hpCurrent)))
    : base.hpCurrent;
  const status = hpCurrent <= 0
    ? 'INACTIVE'
    : (parsed.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
  return {
    ...base,
    instanceId: typeof parsed.instanceId === 'string' && parsed.instanceId.length > 0
      ? parsed.instanceId
      : base.instanceId,
    birthDateMs: typeof parsed.birthDateMs === 'number' ? Math.floor(parsed.birthDateMs) : base.birthDateMs,
    lastCareTimeMs: typeof parsed.lastCareTimeMs === 'number'
      ? Math.floor(parsed.lastCareTimeMs)
      : base.lastCareTimeMs,
    agingPauseMs: typeof parsed.agingPauseMs === 'number'
      ? Math.max(0, Math.floor(parsed.agingPauseMs))
      : (typeof parsed.longevityBonus === 'number'
        ? Math.max(0, Math.floor(parsed.longevityBonus)) * 24 * 60 * 60 * 1000
        : base.agingPauseMs),
    longevityBonus: typeof parsed.longevityBonus === 'number'
      ? Math.max(0, Math.floor(parsed.longevityBonus))
      : base.longevityBonus,
    hpCurrent: hpCurrent <= 0 ? 0 : hpCurrent,
    status,
    affinityXp: typeof parsed.affinityXp === 'number'
      ? Math.max(0, Math.floor(parsed.affinityXp))
      : 0,
  };
}

function restoreRosterFromStorage(): PlayerPetRosterSnapshot {
  if (typeof localStorage === 'undefined') return createEmptyPetRoster();

  try {
    const rawRoster = localStorage.getItem(ROSTER_STORAGE_KEY);
    if (rawRoster) {
      const parsed = JSON.parse(rawRoster) as Partial<PlayerPetRosterSnapshot>;
      const pets = Array.isArray(parsed.pets)
        ? parsed.pets
          .filter((entry) => entry && typeof entry.kindId === 'string')
          .slice(0, 3)
          .map((entry) => hydratePetFromPartial(entry as Partial<PetSnapshot>, entry.kindId as PetKindId))
        : [];
      const activeSlotIndex =
        typeof parsed.activeSlotIndex === 'number' && parsed.activeSlotIndex >= 0
          ? Math.min(pets.length - 1, Math.floor(parsed.activeSlotIndex))
          : null;
      const selectedSlotIndex =
        typeof parsed.selectedSlotIndex === 'number'
          ? Math.min(2, Math.max(0, Math.floor(parsed.selectedSlotIndex)))
          : 0;
      return { pets, activeSlotIndex, selectedSlotIndex };
    }

    const legacyRaw = localStorage.getItem(LEGACY_PET_STORAGE_KEY);
    if (!legacyRaw) return createEmptyPetRoster();

    const legacy = JSON.parse(legacyRaw) as Partial<PetSnapshot>;
    if (typeof legacy.kindId !== 'string') return createEmptyPetRoster();

    const pet = hydratePetFromPartial(legacy, legacy.kindId as PetKindId);
    return {
      pets: [pet],
      activeSlotIndex: pet.status === 'ACTIVE' ? 0 : null,
      selectedSlotIndex: 0,
    };
  } catch {
    return createEmptyPetRoster();
  }
}

/**
 * Espelho local do roster de pets — cliente hostil.
 * Mutações autoritativas chegam via combate/NPC (gateway futuro).
 */
class PlayerPetStore {
  private roster: PlayerPetRosterSnapshot = createEmptyPetRoster();
  private readonly listeners = new Set<Listener>();
  private readonly rosterListeners = new Set<RosterListener>();
  private readonly rationChargeListeners = new Set<RationChargesListener>();
  private battlePetParticipated = false;
  private explorationAffinityMs = 0;
  private rationCharges = readRationChargesFromStorage();
  private lastPetAffectionAtMs: number | null = readLastPetAffectionAtFromStorage();
  private lastPetRationFeedAtMs: number | null = readLastPetRationFeedAtFromStorage();
  private rosterPersistTimer: ReturnType<typeof setTimeout> | null = null;
  private applyingFromServer = false;

  /** Aplica snapshot autoritativo — único writer permitido em modo online. */
  applyPetStateFromServer(payload: AuthoritativePetStatePayload): void {
    this.applyingFromServer = true;
    try {
      this.roster = {
        pets: payload.roster.pets.map((pet) => ({ ...pet })),
        activeSlotIndex: payload.roster.activeSlotIndex,
        selectedSlotIndex: payload.roster.selectedSlotIndex,
      };
      this.rationCharges = Math.max(0, Math.floor(payload.affinity.rationCharges));
      this.lastPetAffectionAtMs = payload.affinity.lastPetAffectionAtMs;
      this.lastPetRationFeedAtMs = payload.affinity.lastPetRationFeedAtMs;
      this.battlePetParticipated = false;
      this.explorationAffinityMs = 0;
      this.publish();
      this.publishRationChargeListeners();
    } finally {
      this.applyingFromServer = false;
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  subscribeRoster(listener: RosterListener): () => void {
    this.rosterListeners.add(listener);
    listener(this.getRoster());
    return () => this.rosterListeners.delete(listener);
  }

  subscribeRationCharges(listener: RationChargesListener): () => void {
    this.rationChargeListeners.add(listener);
    listener(this.getRationCharges());
    return () => this.rationChargeListeners.delete(listener);
  }

  getRationCharges(): number {
    return this.rationCharges;
  }

  getPetAffinitySnapshot(): Omit<PetAffinityStateSnapshot, 'revision'> {
    return {
      lastPetAffectionAtMs: this.lastPetAffectionAtMs,
      lastPetRationFeedAtMs: this.lastPetRationFeedAtMs,
      rationCharges: this.rationCharges,
    };
  }

  /** Atualiza roster vindo do servidor (economy-event). */
  applyPetRosterFromServer(roster: PlayerPetRosterSnapshot): void {
    this.applyingFromServer = true;
    try {
      this.roster = {
        pets: roster.pets.map((pet) => ({ ...pet })),
        activeSlotIndex: roster.activeSlotIndex,
        selectedSlotIndex: roster.selectedSlotIndex,
      };
      this.flushRosterPersist();
      this.publish();
      this.publishRosterListeners();
    } finally {
      this.applyingFromServer = false;
    }
  }

  /** Atualiza cargas/cooldowns vindos do servidor (economy-event). */
  applyPetAffinityFromServer(payload: {
    readonly rationCharges: number;
    readonly lastPetRationFeedAtMs: number | null;
    readonly lastPetAffectionAtMs: number | null;
  }): void {
    this.applyingFromServer = true;
    try {
      this.rationCharges = Math.max(0, Math.floor(payload.rationCharges));
      this.lastPetRationFeedAtMs = payload.lastPetRationFeedAtMs;
      this.lastPetAffectionAtMs = payload.lastPetAffectionAtMs;
      saveRationChargesToStorage(this.rationCharges);
      if (this.lastPetRationFeedAtMs !== null) {
        saveLastPetRationFeedAtToStorage(this.lastPetRationFeedAtMs);
      } else {
        clearLastPetRationFeedAtFromStorage();
      }
      if (this.lastPetAffectionAtMs !== null) {
        saveLastPetAffectionAtToStorage(this.lastPetAffectionAtMs);
      } else {
        clearLastPetAffectionAtFromStorage();
      }
      this.publishRationChargeListeners();
    } finally {
      this.applyingFromServer = false;
    }
  }

  addRationCharges(amount: number): void {
    if (blockLocalPetMutation()) return;
    const delta = Math.max(0, Math.floor(amount));
    if (delta <= 0) return;
    this.rationCharges += delta;
    saveRationChargesToStorage(this.rationCharges);
    this.publishRationChargeListeners();
  }

  consumeRationCharge(): boolean {
    if (blockLocalPetMutation()) return false;
    if (this.rationCharges <= 0) return false;
    this.rationCharges -= 1;
    saveRationChargesToStorage(this.rationCharges);
    this.publishRationChargeListeners();
    return true;
  }

  /** Pet convocado — mapa, combate e espelho da Ficha Personagem. */
  getSnapshot(): PetSnapshot | null {
    this.syncPetLifeCycle();
    const summoned = resolveSummonedPet(this.roster);
    return summoned ? { ...summoned } : null;
  }

  getRoster(): PlayerPetRosterSnapshot {
    this.syncPetLifeCycle();
    return this.getRosterInternal();
  }

  /** Leitura interna — sem re-sync (evita reentrada no ciclo de vida). */
  getRosterInternal(): PlayerPetRosterSnapshot {
    return {
      pets: [...this.roster.pets],
      activeSlotIndex: this.roster.activeSlotIndex,
      selectedSlotIndex: this.roster.selectedSlotIndex,
    };
  }

  getSelectedSlotIndex(): number {
    return this.roster.selectedSlotIndex;
  }

  commitRoster(next: PlayerPetRosterSnapshot): void {
    if (!this.applyingFromServer && blockLocalPetMutation()) return;
    this.roster = {
      pets: next.pets.map((pet) => ({ ...pet })),
      activeSlotIndex: next.activeSlotIndex,
      selectedSlotIndex: next.selectedSlotIndex,
    };
    this.flushRosterPersist();
    this.publish();
  }

  getSelectedPet(): PetSnapshot | null {
    this.syncPetLifeCycle();
    const pet = resolveSelectedPet(this.roster);
    return pet ? { ...pet } : null;
  }

  isVisibleInWorld(): boolean {
    return this.getSnapshot() !== null;
  }

  canAdoptMore(): boolean {
    return canAdoptMorePets(this.roster);
  }

  selectPetSlot(slotIndex: number): void {
    if (blockLocalPetMutation()) return;
    const next = selectPetSlot(this.roster, slotIndex);
    if (next.selectedSlotIndex === this.roster.selectedSlotIndex) return;
    this.roster = next;
    this.scheduleRosterPersist();
    this.publishRosterListeners();
  }

  activatePetSlot(slotIndex: number): boolean {
    if (blockLocalPetMutation()) return false;
    const before = this.roster.activeSlotIndex;
    this.roster = activatePetSlot(this.roster, slotIndex);
    if (this.roster.activeSlotIndex === before) return false;
    this.flushRosterPersist();
    this.publish();
    return true;
  }

  deactivateAllPets(): void {
    if (blockLocalPetMutation()) return;
    this.roster = deactivateAllPetSlots(this.roster);
    this.flushRosterPersist();
    this.publish();
  }

  /** @deprecated Use adoptPet — mantém compat com código legado. */
  setPet(pet: PetSnapshot | null): void {
    if (blockLocalPetMutation()) return;
    if (!pet) {
      this.reset();
      return;
    }
    this.roster = {
      pets: [pet],
      activeSlotIndex: pet.status === 'ACTIVE' ? 0 : null,
      selectedSlotIndex: 0,
    };
    this.flushRosterPersist();
    this.publish();
  }

  adoptPet(
    kindId: PetKindId,
    options: { readonly name: string; readonly colorId: PetColorId; readonly gender: PetGenderId },
  ): boolean {
    if (blockLocalPetMutation()) return false;
    const next = appendPetToRoster(this.roster, createPetSnapshot(kindId, options));
    if (!next) return false;
    this.roster = next;
    this.flushRosterPersist();
    this.publish();
    return true;
  }

  /** @deprecated Ativação só na HUD Pet Love. */
  toggleSummoned(): boolean {
    if (blockLocalPetMutation()) return false;
    if (this.roster.activeSlotIndex !== null) {
      this.deactivateAllPets();
      return true;
    }
    const firstOperational = this.roster.pets.findIndex((pet) => pet.hpCurrent > 0);
    if (firstOperational < 0) return false;
    return this.activatePetSlot(firstOperational);
  }

  applyBattleDefeat(): void {
    if (blockLocalPetMutation()) return;
    if (this.roster.activeSlotIndex === null) return;
    const slot = this.roster.activeSlotIndex;
    const pet = this.roster.pets[slot];
    if (!pet) return;
    this.roster = updatePetInRoster(this.roster, slot, {
      ...pet,
      hpCurrent: 0,
      status: 'INACTIVE',
    });
    this.roster = { ...this.roster, activeSlotIndex: null };
    this.flushRosterPersist();
    this.publish();
  }

  applyRevivalAtCael(): void {
    if (blockLocalPetMutation()) return;
    const slot = this.roster.selectedSlotIndex;
    const pet = this.roster.pets[slot];
    if (!pet) return;
    let revived = revivePet(pet);
    revived = applyPetAffinityXp(revived, PET_AFFINITY_CONFIG.rewards.revivalAtCaelBonus);
    this.roster = updatePetInRoster(this.roster, slot, revived);
    this.flushRosterPersist();
    this.publish();
  }

  markBattleAffinityBaseline(): void {
    if (blockLocalPetMutation()) return;
    const pet = this.getSnapshot();
    this.battlePetParticipated = Boolean(pet && canPetEnterBattle(pet));
  }

  applyBattleAffinityReward(victory: boolean): void {
    if (blockLocalPetMutation()) return;
    if (!victory || this.roster.activeSlotIndex === null || !this.battlePetParticipated) {
      this.battlePetParticipated = false;
      return;
    }

    const slot = this.roster.activeSlotIndex;
    const pet = this.roster.pets[slot];
    if (!pet) {
      this.battlePetParticipated = false;
      return;
    }

    const reward = pet.hpCurrent > 0 && pet.status === 'ACTIVE'
      ? PET_AFFINITY_CONFIG.rewards.battleVictoryPetAlive
      : PET_AFFINITY_CONFIG.rewards.battleVictoryPetFainted;

    this.roster = updatePetInRoster(this.roster, slot, applyPetAffinityXp(pet, reward));
    this.battlePetParticipated = false;
    this.flushRosterPersist();
    this.publish();
  }

  getPetAffectionAvailability(now = Date.now()): PetAffectionAvailability {
    return resolvePetAffectionAvailability(this.lastPetAffectionAtMs, now);
  }

  getLastPetRationFeedAtMs(): number | null {
    return this.lastPetRationFeedAtMs;
  }

  getPetRationFeedAvailability(now = Date.now()): PetRationFeedAvailability {
    return resolvePetRationFeedAvailability(this.lastPetRationFeedAtMs, now);
  }

  recordPetRationFeedAt(now = Date.now()): void {
    if (blockLocalPetMutation()) return;
    this.lastPetRationFeedAtMs = Math.floor(now);
    saveLastPetRationFeedAtToStorage(this.lastPetRationFeedAtMs);
  }

  applyPetAffection(now = Date.now()):
    | { readonly ok: true; readonly xpGained: number }
    | { readonly ok: false; readonly reason: string; readonly remainingMs: number } {
    if (blockLocalPetMutation()) {
      return { ok: false, reason: ONLINE_PET_MUTATION_MESSAGE, remainingMs: 0 };
    }
    const slot = this.roster.selectedSlotIndex;
    const pet = this.roster.pets[slot];
    if (!pet) {
      return { ok: false, reason: 'Nenhum pet neste slot.', remainingMs: 0 };
    }

    const availability = this.getPetAffectionAvailability(now);
    if (!availability.canAffect) {
      return {
        ok: false,
        reason: 'Carinho disponível em breve.',
        remainingMs: availability.remainingMs,
      };
    }

    this.roster = updatePetInRoster(
      this.roster,
      slot,
      applyPetCare(applyPetAffinityXp(pet, PET_AFFECTION_CONFIG.affinityReward), now),
    );
    this.lastPetAffectionAtMs = Math.floor(now);
    saveLastPetAffectionAtToStorage(this.lastPetAffectionAtMs);
    this.flushRosterPersist();
    this.publish();
    return { ok: true, xpGained: PET_AFFECTION_CONFIG.affinityReward };
  }

  tickExplorationAffinity(deltaMs: number): void {
    if (blockLocalPetMutation()) return;
    if (!this.isVisibleInWorld() || deltaMs <= 0 || this.roster.activeSlotIndex === null) return;

    this.explorationAffinityMs += deltaMs;
    const interval = PET_AFFINITY_CONFIG.explorationIntervalMs;
    if (this.explorationAffinityMs < interval) return;

    const ticks = Math.floor(this.explorationAffinityMs / interval);
    this.explorationAffinityMs -= ticks * interval;

    const gain = ticks * PET_AFFINITY_CONFIG.rewards.explorationSummonedTick;
    const slot = this.roster.activeSlotIndex;
    const pet = this.roster.pets[slot];
    if (gain <= 0 || !pet) return;

    const updated = applyPetAffinityXp(pet, gain);
    if (updated.affinityXp === pet.affinityXp) return;

    this.roster = updatePetInRoster(this.roster, slot, updated);
    this.flushRosterPersist();
    this.publish();
  }

  reset(): void {
    if (blockLocalPetMutation()) return;
    this.roster = createEmptyPetRoster();
    this.battlePetParticipated = false;
    this.explorationAffinityMs = 0;
    this.lastPetAffectionAtMs = null;
    this.lastPetRationFeedAtMs = null;
    clearLastPetAffectionAtFromStorage();
    clearLastPetRationFeedAtFromStorage();
    this.rationCharges = 0;
    clearRationChargesFromStorage();
    this.flushRosterPersist();
    this.publish();
    this.publishRationChargeListeners();
  }

  hydrateFromStorage(roster: PlayerPetRosterSnapshot): void {
    this.roster = {
      pets: roster.pets.map((pet) => ({ ...pet })),
      activeSlotIndex: roster.activeSlotIndex,
      selectedSlotIndex: roster.selectedSlotIndex,
    };
  }

  private publish(): void {
    const snapshot = this.getSnapshotWithoutLifeSync();
    const roster = this.getRosterInternal();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
    this.publishRosterListeners(roster);
    uiEvents.emit(UIEventType.PLAYER_PET_UPDATED, { pet: snapshot });
  }

  /** Notifica HUDs do roster sem emitir PLAYER_PET_UPDATED (troca de aba). */
  private publishRosterListeners(roster = this.getRosterInternal()): void {
    for (const listener of this.rosterListeners) {
      listener(roster);
    }
  }

  private publishRationChargeListeners(): void {
    const charges = this.rationCharges;
    for (const listener of this.rationChargeListeners) {
      listener(charges);
    }
  }

  private scheduleRosterPersist(): void {
    if (this.rosterPersistTimer !== null) {
      clearTimeout(this.rosterPersistTimer);
    }
    this.rosterPersistTimer = setTimeout(() => {
      this.rosterPersistTimer = null;
      this.flushRosterPersist();
    }, 400);
  }

  private flushRosterPersist(): void {
    if (this.rosterPersistTimer !== null) {
      clearTimeout(this.rosterPersistTimer);
      this.rosterPersistTimer = null;
    }
    saveRosterToStorage(this.roster);
  }

  private getSnapshotWithoutLifeSync(): PetSnapshot | null {
    const summoned = resolveSummonedPet(this.roster);
    return summoned ? { ...summoned } : null;
  }

  private syncPetLifeCycle(): void {
    getPetStateStore().syncLifeExpiration();
  }
}

let store: PlayerPetStore | null = null;
let petLifeBridgesInitialized = false;

function initPetLifeBridges(): void {
  if (petLifeBridgesInitialized) return;
  petLifeBridgesInitialized = true;
  initPetInheritanceBridge();
  initPetMemorialNotificationBridge();
}

export function getPlayerPetStore(): PlayerPetStore {
  if (!store) {
    store = new PlayerPetStore();
    store.hydrateFromStorage(restoreRosterFromStorage());
    getPetStateStore().bindRosterPersistence(store);
    getPetStateStore().syncLifeExpiration();
    initPetLifeBridges();
  }
  return store;
}

export function initPlayerPetStore(): PlayerPetStore {
  return getPlayerPetStore();
}

export function resetPlayerPetStore(): void {
  store = null;
  petLifeBridgesInitialized = false;
  resetPetStateStore();
}
