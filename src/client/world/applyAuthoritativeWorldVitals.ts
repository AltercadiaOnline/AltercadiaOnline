/**
 * Aplica vitals autoritativos no bridge cross-bundle (SSOT) e nos stores do bundle atual.
 */

import type { PlayerWorldVitals } from '../../shared/character/equipmentState.js';
import { getWorldVitalsBridge } from '../app/bridge/worldVitalsBridge.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';

export function applyAuthoritativeWorldVitals(
  vitals: Partial<PlayerWorldVitals>,
): PlayerWorldVitals {
  const snap = getWorldVitalsBridge().apply(vitals);
  // Stores locais do bundle — React app-ui espelha via subscribe no bridge.
  getGlobalPlayerStore().applyWorldVitals(snap.vitals);
  getPlayerEquipmentStore().setVitals(snap.vitals);
  return snap.vitals;
}
