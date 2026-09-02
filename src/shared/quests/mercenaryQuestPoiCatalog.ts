/** POIs de contrato mercenário — label + texto de interação (HUD/diálogo). */

export type MercenaryQuestPoiDefinition = {
  readonly poiId: string;
  readonly label: string;
  readonly interactText: string;
  /** Rótulo do botão quando o contrato pede interact neste POI. */
  readonly actionLabel: string;
};

const POIS: readonly MercenaryQuestPoiDefinition[] = [
  {
    poiId: 'quest_poi_q3_drone_telhado',
    label: 'Destroços do Drone',
    interactText: 'Casco fumegante do drone corporativo. O mapa de patrulha ainda está preso no compartimento.',
    actionLabel: 'Recuperar mapa',
  },
  {
    poiId: 'quest_poi_q4_totem_1',
    label: 'Totem Holográfico',
    interactText: 'Propaganda Vórtex em loop. Dá para injetar o vírus da resistência.',
    actionLabel: 'Limpar totem',
  },
  {
    poiId: 'quest_poi_q4_totem_2',
    label: 'Totem Holográfico',
    interactText: 'Segundo totem da praça — feed ainda ativo.',
    actionLabel: 'Limpar totem',
  },
  {
    poiId: 'quest_poi_q4_totem_3',
    label: 'Totem Holográfico',
    interactText: 'Terceiro totem — último da sequência.',
    actionLabel: 'Limpar totem',
  },
  {
    poiId: 'quest_poi_q5_alfandega',
    label: 'Contêiner da Alfândega',
    interactText: 'Grades e strobes amarelos. Baterias de alta densidade dentro do contêiner demarcado.',
    actionLabel: 'Roubar baterias',
  },
];

const BY_ID = new Map(POIS.map((poi) => [poi.poiId, poi] as const));

export function getMercenaryQuestPoiById(poiId: string): MercenaryQuestPoiDefinition | null {
  return BY_ID.get(poiId) ?? null;
}

export function getAllMercenaryQuestPois(): readonly MercenaryQuestPoiDefinition[] {
  return POIS;
}
