import type { CombatLoadoutResolveInput } from '../../../shared/combat/combatLoadoutResolver.js';
import { resolvePlayerHpMaxFromLoadoutInput } from '../../../shared/character/resolvePlayerHpMax.js';
import { applyPlayerHpMaxChange } from '../../../shared/character/playerVitals.js';
import type { EquippedSlots } from '../../../shared/character/equipmentState.js';
import type { ClassType } from '../../../shared/types/classes.js';
import type { MarcosNodeProgressionData } from '../../../shared/progression/marcoProgression.js';
import { getPlayerEquipmentStore } from './playerEquipmentStore.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import { getPlayerMarcosStore } from '../marcos/playerMarcosStore.js';
import { getGlobalPlayerStore } from '../moveset/globalPlayerStore.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

export function buildHudCombatLoadoutInput(params: {
  readonly classId: ClassType;
  readonly level: number;
  readonly equipped: EquippedSlots;
  readonly activeMarcos: readonly string[];
  readonly nodeProgression: MarcosNodeProgressionData;
  readonly flowSpeedBase: number;
  readonly equippedSkillIds: readonly string[];
}): CombatLoadoutResolveInput {
  return {
    classId: params.classId,
    level: params.level,
    equipped: params.equipped,
    activeMarcos: params.activeMarcos,
    nodeProgression: params.nodeProgression,
    flowSpeedBase: params.flowSpeedBase,
    equippedSkillIds: params.equippedSkillIds,
  };
}

export function resolveHudPlayerHpMaxFromStores(): number {
  const equip = getPlayerEquipmentStore().getSnapshot();
  const marcos = getPlayerMarcosStore().getSnapshot();
  const equippedSkillIds = getGlobalPlayerStore().getConfirmedLoadout();
  return resolvePlayerHpMaxFromLoadoutInput(
    buildHudCombatLoadoutInput({
      classId: equip.classId,
      level: equip.level,
      equipped: getPlayerItemStore().getEquippedSlots(),
      activeMarcos: marcos.activeMarcos,
      nodeProgression: marcos.nodeProgression,
      flowSpeedBase: marcos.flowSpeedBase,
      equippedSkillIds,
    }),
  );
}

let refreshInFlight = false;

/** Alinha hpMax da HUD com o combate; ganho de buff preenche o HP atual (ex.: 112/112). */
export function refreshHudPlayerHpMax(): void {
  if (refreshInFlight) return;
  refreshInFlight = true;
  try {
    const hpMax = resolveHudPlayerHpMaxFromStores();
    const current = getPlayerEquipmentStore().getSnapshot().vitals;
    const previousMax = current.hpMax > 0 ? current.hpMax : hpMax;
    const hpCurrent = applyPlayerHpMaxChange(current.hpCurrent, previousMax, hpMax);

    if (current.hpMax !== hpMax || current.hpCurrent !== hpCurrent) {
      getPlayerEquipmentStore().setVitals({ hpMax, hpCurrent });
    }

    const global = getGlobalPlayerStore().getWorldVitals();
    const equipVitals = getPlayerEquipmentStore().getSnapshot().vitals;
    if (
      global.hpMax !== equipVitals.hpMax
      || global.hpCurrent !== equipVitals.hpCurrent
      || global.mpMax !== equipVitals.mpMax
      || global.mpCurrent !== equipVitals.mpCurrent
    ) {
      getGlobalPlayerStore().syncWorldVitalsFromEquipment();
    }
  } finally {
    refreshInFlight = false;
  }
}

export function initPlayerHudHpMaxSync(): void {
  const refresh = (): void => {
    refreshHudPlayerHpMax();
  };

  uiEvents.on(UIEventType.PLAYER_ITEMS_UPDATED, refresh);
  uiEvents.on(UIEventType.EQUIPMENT_UPDATED, refresh);
  uiEvents.on(UIEventType.MARCOS_UPDATED, refresh);
  uiEvents.on(UIEventType.LOADOUT_SAVED, refresh);
  uiEvents.on(UIEventType.CHARACTER_LEVEL_UPDATED, refresh);
  refresh();
}
