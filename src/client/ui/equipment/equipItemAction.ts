import type { EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';

import { getActionDispatcher } from '../../ActionDispatcher.js';

import { alertSystem } from '../alertSystem.js';



function handleDispatchResult(result: ReturnType<ReturnType<typeof getActionDispatcher>['dispatch']>): boolean {

  if (!result.ok) {

    alertSystem(result.reason);

    return false;

  }

  return true;

}



/** Duplo-clique no inventário — equipa (nunca toggle). */

export function dispatchEquipFromInventory(itemId: string, slot?: EquipmentUiSlotId): boolean {

  const result = getActionDispatcher().dispatch({

    type: 'EQUIP_FROM_INVENTORY',

    payload: {

      itemId,

      ...(slot !== undefined ? { uiSlotId: slot } : {}),

    },

  });

  return handleDispatchResult(result);

}



/** Duplo-clique no slot do SET — desequipa (nunca toggle). */

export function dispatchUnequipFromSlot(slotId: EquipmentUiSlotId): boolean {

  const result = getActionDispatcher().dispatch({

    type: 'UNEQUIP_TO_INVENTORY',

    payload: { slotId },

  });

  return handleDispatchResult(result);

}



/** @deprecated Prefer dispatchEquipFromInventory / dispatchUnequipFromSlot */

export function dispatchEquipItem(itemId: string, slot?: EquipmentUiSlotId): boolean {

  const result = getActionDispatcher().dispatch({

    type: 'EQUIP_ITEM',

    payload: {

      itemId,

      ...(slot !== undefined ? { slot } : {}),

    },

  });

  return handleDispatchResult(result);

}

