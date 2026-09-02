import { CONSTRUCT_FARM_MAIN_LAYOUT } from './constructFarmLayoutConstants.js';

import { getActiveConstructFarmLayout } from './activeConstructFarmLayout.js';



export {

  CONSTRUCT_FARM_MAIN_LAYOUT,

  CONSTRUCT_FARM_SUBZONE_LAYOUTS,

  type ConstructFarmSubzoneLayout,

  isKnownConstructFarmLayout,

} from './constructFarmLayoutConstants.js';



/** @deprecated Use getActiveConstructFarmLayout() — layout dinâmico por portal/persistência. */

export const CONSTRUCT_FARM_ACTIVE_LAYOUT = CONSTRUCT_FARM_MAIN_LAYOUT;



export function isConstructFarmLayoutActive(constructLayout: string): boolean {

  return constructLayout === getActiveConstructFarmLayout();

}

