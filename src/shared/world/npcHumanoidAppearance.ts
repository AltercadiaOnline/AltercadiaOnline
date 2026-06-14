/** Acessórios condicionais desenhados sobre a silhueta humanóide. */
export const NpcHumanoidAccessory = {
  GLASSES: 'glasses',
  HAT: 'hat',
  HOOD: 'hood',
  APRON: 'apron',
  BANDANA: 'bandana',
  VISOR: 'visor',
} as const;

export type NpcHumanoidAccessory =
  (typeof NpcHumanoidAccessory)[keyof typeof NpcHumanoidAccessory];

export type NpcHumanoidPalette = {
  /** Tronco, braços e pernas. */
  readonly body: string;
  /** Tom mais claro — rosto / cabeça. */
  readonly face: string;
  /** Detalhes, adereços e contornos de destaque. */
  readonly accent: string;
  /** Membros levemente mais escuros (profundidade). */
  readonly limb: string;
  readonly accessories: readonly NpcHumanoidAccessory[];
};

const DEFAULT_PALETTE: NpcHumanoidPalette = {
  body: '#555555',
  face: '#777777',
  accent: '#aaaaaa',
  limb: '#444444',
  accessories: [],
};

/** Paletas por chave `sprite` do NPC_REGISTRY — sem assets externos. */
export const NPC_HUMANOID_APPEARANCE: Record<string, NpcHumanoidPalette> = {
  elder: {
    body: '#6b5b95',
    face: '#8f7fb8',
    accent: '#ffd700',
    limb: '#564876',
    accessories: [NpcHumanoidAccessory.GLASSES, NpcHumanoidAccessory.HAT],
  },
  mercenary: {
    body: '#8b3a3a',
    face: '#a85555',
    accent: '#c0c0c0',
    limb: '#6e2e2e',
    accessories: [NpcHumanoidAccessory.BANDANA],
  },
  blacksmith: {
    body: '#4a4a4a',
    face: '#6a6a6a',
    accent: '#ff6b35',
    limb: '#353535',
    accessories: [NpcHumanoidAccessory.APRON],
  },
  merchant: {
    body: '#2d6a4f',
    face: '#3f8a68',
    accent: '#f4d35e',
    limb: '#245a42',
    accessories: [NpcHumanoidAccessory.HAT],
  },
  alchemist: {
    body: '#5a189a',
    face: '#7b3fbf',
    accent: '#80ffdb',
    limb: '#481578',
    accessories: [NpcHumanoidAccessory.GLASSES, NpcHumanoidAccessory.HOOD],
  },
  trainer: {
    body: '#264653',
    face: '#3a6578',
    accent: '#2a9d8f',
    limb: '#1e3640',
    accessories: [NpcHumanoidAccessory.BANDANA],
  },
  instructor: {
    body: '#243040',
    face: '#3a4f66',
    accent: '#7ec8ff',
    limb: '#1a2530',
    accessories: [NpcHumanoidAccessory.GLASSES, NpcHumanoidAccessory.VISOR],
  },
  banker: {
    body: '#1d3557',
    face: '#2f4f7a',
    accent: '#e9c46a',
    limb: '#152a45',
    accessories: [NpcHumanoidAccessory.HAT, NpcHumanoidAccessory.GLASSES],
  },
};

export function resolveNpcHumanoidAppearance(sprite: string): NpcHumanoidPalette {
  return NPC_HUMANOID_APPEARANCE[sprite] ?? DEFAULT_PALETTE;
}

export function isHumanoidNpcSprite(sprite: string): boolean {
  return sprite !== 'terminal' && sprite !== 'pulpit';
}
