import type { ClassType } from '../../shared/types/classes.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';

/** Lê a classe ativa no momento do spawn — dinâmico (sem cache de assets). */
export function resolveActivePlayerClassId(): ClassType {
  try {
    return getPlayerEquipmentStore().getSnapshot().classId;
  } catch {
    return 'IMPETUS';
  }
}
