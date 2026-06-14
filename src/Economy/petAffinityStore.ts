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

export function resetPetAffinityStore(): void {
  records.clear();
}
