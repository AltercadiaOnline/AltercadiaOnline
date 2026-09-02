import {
  CONSTRUCT_FARM_MAIN_LAYOUT,
  isKnownConstructFarmLayout,
} from './constructFarmLayoutConstants.js';

/** Layout Construct ativo em `farm_zone_01` — espelha `PlayerWorldProfile.constructFarmLayout`. */
let activeLayout: string = CONSTRUCT_FARM_MAIN_LAYOUT;

export function getActiveConstructFarmLayout(): string {
  return activeLayout;
}

export function setActiveConstructFarmLayout(layout: string): void {
  activeLayout = layout;
}

export function resetActiveConstructFarmLayout(): void {
  activeLayout = CONSTRUCT_FARM_MAIN_LAYOUT;
}

export function isConstructFarmLayoutActive(constructLayout: string): boolean {
  return constructLayout === getActiveConstructFarmLayout();
}

export { isKnownConstructFarmLayout };
