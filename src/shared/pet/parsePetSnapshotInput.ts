import { createPetSnapshot, getPetDefinition, isPetKindId } from './petCatalog.js';
import { getDefaultPetColorId, sanitizePetColorId } from './petColorPalette.js';
import { getDefaultPetGenderId, sanitizePetGenderId } from './petGender.js';
import { clampPetAffinityXp } from './petAffinity.js';
import { sanitizePetDisplayName } from './petNameValidation.js';
import { sanitizePetCareFields } from './petState.js';
import type { PetSnapshot } from './petModel.js';

/** Sanitiza pet enviado pelo cliente — stats autoritativos vêm do catálogo. */
export function sanitizePetSnapshotFromClient(raw: unknown): PetSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const kindId = record.kindId;
  if (typeof kindId !== 'string' || !isPetKindId(kindId)) return null;

  const def = getPetDefinition(kindId);
  const defaultColor = getDefaultPetColorId(kindId);
  const colorId = sanitizePetColorId(record.colorId, defaultColor);
  const gender = sanitizePetGenderId(record.gender, getDefaultPetGenderId());
  const name = sanitizePetDisplayName(record.name) ?? def.name;

  let status: PetSnapshot['status'] = record.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const hpMax = def.hpMax;
  let hpCurrent = typeof record.hpCurrent === 'number' ? Math.floor(record.hpCurrent) : hpMax;
  hpCurrent = Math.max(0, Math.min(hpMax, hpCurrent));
  if (hpCurrent <= 0) {
    hpCurrent = 0;
    status = 'INACTIVE';
  }

  const draft = createPetSnapshot(kindId, { name, colorId, gender });
  const care = sanitizePetCareFields({
    ...draft,
    instanceId: typeof record.instanceId === 'string' ? record.instanceId : draft.instanceId,
    birthDateMs: typeof record.birthDateMs === 'number' ? record.birthDateMs : draft.birthDateMs,
    lastCareTimeMs: typeof record.lastCareTimeMs === 'number' ? record.lastCareTimeMs : draft.lastCareTimeMs,
    agingPauseMs: typeof record.agingPauseMs === 'number' ? record.agingPauseMs : draft.agingPauseMs,
    longevityBonus: typeof record.longevityBonus === 'number' ? record.longevityBonus : draft.longevityBonus,
  });

  return {
    ...care,
    kindId,
    name,
    colorId,
    gender,
    hpMax,
    hpCurrent,
    status,
    baseDamage: def.baseDamage,
    affinityXp: clampPetAffinityXp(typeof record.affinityXp === 'number' ? record.affinityXp : 0),
  };
}
