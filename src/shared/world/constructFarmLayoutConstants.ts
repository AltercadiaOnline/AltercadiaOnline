export const CONSTRUCT_FARM_MAIN_LAYOUT = 'zonabeco1' as const;

export const CONSTRUCT_FARM_SUBZONE_LAYOUTS = [
  'zonabeco1a',
  'zonabeco1b',
  'zonabeco1c',
] as const;

export type ConstructFarmSubzoneLayout = (typeof CONSTRUCT_FARM_SUBZONE_LAYOUTS)[number];

export function isKnownConstructFarmLayout(constructLayout: string): boolean {
  return (
    constructLayout === CONSTRUCT_FARM_MAIN_LAYOUT
    || (CONSTRUCT_FARM_SUBZONE_LAYOUTS as readonly string[]).includes(constructLayout)
  );
}
