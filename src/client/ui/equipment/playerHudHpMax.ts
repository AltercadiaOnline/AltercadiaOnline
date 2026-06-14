import type { CombatLoadoutResolveInput } from '../../../shared/combat/combatLoadoutResolver.js';
import { resolvePlayerHpMaxFromLoadoutInput } from '../../../shared/character/resolvePlayerHpMax.js';
import { clampPlayerHpCurrent } from '../../../shared/character/playerVitals.js';
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

/** Alinha hpMax da HUD lateral com o combate (equipamento, marcos, loadout). */
export function refreshHudPlayerHpMax(): void {
  const hpMax = resolveHudPlayerHpMaxFromStores();
  const equip = getPlayerEquipmentStore().getSnapshot();
  const hpCurrent = clampPlayerHpCurrent(equip.vitals.hpCurrent, hpMax);
  const current = getPlayerEquipmentStore().getSnapshot().vitals;
  const global = getGlobalPlayerStore().getWorldVitals();
  if (
    current.hpMax === hpMax &&
    current.hpCurrent === hpCurrent &&
    global.hpMax === hpMax &&
    global.hpCurrent === hpCurrent
  ) {
    return;
  }

  getPlayerEquipmentStore().setVitals({ hpMax, hpCurrent });
  getGlobalPlayerStore().syncWorldVitalsFromEquipment();
}

export function initPlayerHudHpMaxSync(): void {
  const refresh = (): void => {
    refreshHudPlayerHpMax();
  };

  uiEvents.on(UIEventType.PLAYER_ITEMS_UPDATED, refresh);
  uiEvents.on(UIEventType.EQUIPMENT_UPDATED, refresh);
  uiEvents.on(UIEventType.MARCOS_UPDATED, refresh);
  uiEvents.on(UIEventType.LOADOUT_SAVED, refresh);
  refresh();
}
