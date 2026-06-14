export type CraftMaterial = {
  readonly itemId: string;
  readonly quantity: number;
};

export type CraftRecipe = {
  readonly id: string;
  readonly craftStationId: string;
  readonly name: string;
  readonly description: string;
  readonly inputs: readonly CraftMaterial[];
  readonly output: {
    readonly itemId: string;
    readonly quantity: number;
  };
};

export const CRAFT_STATION_FERREIRO = 'ferreiro';

/** Receitas autoritativas — validadas no servidor via CraftItemHandler. */
export const CRAFT_RECIPES: readonly CraftRecipe[] = [
  {
    id: 'ferreiro_bone_tonic',
    craftStationId: CRAFT_STATION_FERREIRO,
    name: 'Tônico de Ossos',
    description: 'Funde ossos em um suporte de recuperação menor.',
    inputs: [{ itemId: 'bones', quantity: 5 }],
    output: { itemId: 'potion_suporte_menor', quantity: 1 },
  },
  {
    id: 'ferreiro_web_brew',
    craftStationId: CRAFT_STATION_FERREIRO,
    name: 'Extrato de Teia',
    description: 'Teia refinada com ossos — suporte tático.',
    inputs: [
      { itemId: 'spider_web', quantity: 3 },
      { itemId: 'bones', quantity: 2 },
    ],
    output: { itemId: 'potion_suporte_menor', quantity: 1 },
  },
  {
    id: 'ferreiro_molten_draught',
    craftStationId: CRAFT_STATION_FERREIRO,
    name: 'Draught Fundido',
    description: 'Viga incandescente destilada em suporte médio.',
    inputs: [
      { itemId: 'molten_beam', quantity: 1 },
      { itemId: 'bones', quantity: 3 },
    ],
    output: { itemId: 'potion_suporte_media', quantity: 1 },
  },
] as const;
