export type PetAffinityRecord = {
  rationCharges: number;
  lastPetRationFeedAtMs: number | null;
  lastPetAffectionAtMs: number | null;
};

const records = new Map<string, PetAffinityRecord>();

function profileKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function defaultRecord(): PetAffinityRecord {
  return {
    rationCharges: 0,
    lastPetRationFeedAtMs: null,
    lastPetAffectionAtMs: null,
  };
}

export function getPetAffinityRecord(
  playerId: string,
  characterId: number,
): PetAffinityRecord {
  const key = profileKey(playerId, characterId);
  const existing = records.get(key);
  if (existing) return existing;
  const created = defaultRecord();
  records.set(key, created);
  return created;
}

export function addRationCharges(
  playerId: string,
  characterId: number,
  amount: number,
): number {
  const delta = Math.max(0, Math.floor(amount));
  if (delta <= 0) return getPetAffinityRecord(playerId, characterId).rationCharges;

  const record = getPetAffinityRecord(playerId, characterId);
  record.rationCharges += delta;
  return record.rationCharges;
}

export function consumeRationCharge(
  playerId: string,
  characterId: number,
): boolean {
  const record = getPetAffinityRecord(playerId, characterId);
  if (record.rationCharges <= 0) return false;
  record.rationCharges -= 1;
  return true;
}

export function recordPetRationFeedAt(
  playerId: string,
  characterId: number,
  now = Date.now(),
): void {
  const record = getPetAffinityRecord(playerId, characterId);
  record.lastPetRationFeedAtMs = now;
}

export function resetPetAffinityStore(): void {
  records.clear();
}

export function exportPetAffinityPersistence(
  playerId: string,
  characterId: number,
): PetAffinityRecord {
  const record = getPetAffinityRecord(playerId, characterId);
  return {
    rationCharges: record.rationCharges,
    lastPetRationFeedAtMs: record.lastPetRationFeedAtMs,
    lastPetAffectionAtMs: record.lastPetAffectionAtMs,
  };
}

export function hydratePetAffinityPersistence(
  playerId: string,
  characterId: number,
  slice: PetAffinityRecord,
): void {
  const key = profileKey(playerId, characterId);
  records.set(key, {
    rationCharges: Math.max(0, Math.floor(slice.rationCharges)),
    lastPetRationFeedAtMs: slice.lastPetRationFeedAtMs,
    lastPetAffectionAtMs: slice.lastPetAffectionAtMs,
  });
}
