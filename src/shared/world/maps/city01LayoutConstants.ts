/** Grade compacta da Cidade 01 — 40×40 blocos na grade oficial 32×32. */
export const CITY_01_MAP_TILES = 40;

/** Metade da grade — eixo urbano da Cidade 01. */
export const CITY_01_MAP_HALF = Math.floor(CITY_01_MAP_TILES / 2);

/** Largura padrão das vias principais. */
export const CITY_01_ROAD_WIDTH = 5;

/** Eixo principal N–S — portal norte até sul da cidade. */
export const CITY_01_ROAD_X_MIN = CITY_01_MAP_HALF - 5;
export const CITY_01_ROAD_X_MAX = CITY_01_MAP_HALF - 1;

/** Ramificação E–O atravessando a praça (5 tiles de altura). */
export const CITY_01_ROAD_Y_MIN = CITY_01_MAP_HALF - 3;
export const CITY_01_ROAD_Y_MAX = CITY_01_MAP_HALF + 1;

/** Praça central compacta 11×11 (~30% menor que a praça 16×16 anterior). */
export const CITY_01_PLAZA_MIN = CITY_01_MAP_HALF - 5;
export const CITY_01_PLAZA_MAX = CITY_01_MAP_HALF + 5;

/** Extensão da rua principal — sul do mapa até portal norte. */
export const CITY_01_ROAD_SOUTH_Y = CITY_01_MAP_TILES - 2;
export const CITY_01_ROAD_NORTH_Y = 1;

/** Bairro residencial (quadrante NO). */
export const CITY_01_RESIDENTIAL_ZONE = {
  id: 'RESIDENTIAL_ZONE',
  tileX: 2,
  tileY: 3,
  tileW: 13,
  tileH: 14,
} as const;

/** Setor comercial (quadrante leste, adjacente ao centro). */
export const CITY_01_COMMERCE_ZONE = {
  id: 'COMMERCE_ZONE',
  tileX: 21,
  tileY: 8,
  tileW: 16,
  tileH: 22,
} as const;

/** Conector residencial — liga casas ao eixo E–O. */
export const CITY_01_RESIDENTIAL_SPINE = {
  id: 'RESIDENTIAL_SPINE',
  tileX: 8,
  tileY: 8,
  tileW: 5,
  tileH: 9,
} as const;

/** Rua comercial vertical — liga praça às lojas a leste. */
export const CITY_01_COMMERCE_SPINE = {
  id: 'COMMERCE_SPINE',
  tileX: 23,
  tileY: 10,
  tileW: 3,
  tileH: 20,
} as const;

/** @deprecated Alias legado — use CITY_01_RESIDENTIAL_ZONE. */
export const CITY_01_FOOD_ZONE = CITY_01_RESIDENTIAL_ZONE;

/** @deprecated Alias legado — use CITY_01_COMMERCE_ZONE. */
export const CITY_01_MARKET_ZONE = CITY_01_COMMERCE_ZONE;

export type City01ZoneRect = {
  readonly id: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
};

export type City01StructureDef = {
  readonly id: string;
  readonly label: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
};

/** Núcleo de combate estático 1×1 — tile autoritativo do guardião. */
export const CITY_01_ARENA_CORE = {
  tileX: CITY_01_MAP_HALF - 1,
  tileY: CITY_01_MAP_HALF - 1,
  tileW: 1,
  tileH: 1,
} as const;

/** Visual compacto da arena — 4×4 (~30% menor que o bloco 5×5 anterior). */
export const CITY_01_ARENA_VISUAL = {
  tileX: CITY_01_ARENA_CORE.tileX - 2,
  tileY: CITY_01_ARENA_CORE.tileY - 2,
  tileW: 4,
  tileH: 4,
} as const;

/** Anel reservado para espectadores (futuro sistema TV). */
export const CITY_01_ARENA_SPECTATOR_RING = {
  tileX: CITY_01_ARENA_CORE.tileX - 3,
  tileY: CITY_01_ARENA_CORE.tileY - 3,
  tileW: 7,
  tileH: 7,
} as const;

export function isCity01ArenaVisualTile(tileX: number, tileY: number): boolean {
  return tileRectContains(CITY_01_ARENA_VISUAL, tileX, tileY);
}

export function isCity01ArenaSpectatorTile(tileX: number, tileY: number): boolean {
  return (
    tileRectContains(CITY_01_ARENA_SPECTATOR_RING, tileX, tileY) &&
    !isCity01ArenaVisualTile(tileX, tileY)
  );
}

/** Degrau sul da arena — transição visual plaza → palco. */
export function isCity01ArenaStageStepTile(tileX: number, tileY: number): boolean {
  const stepY = CITY_01_ARENA_VISUAL.tileY + CITY_01_ARENA_VISUAL.tileH;
  return (
    tileY === stepY &&
    tileX >= CITY_01_ARENA_VISUAL.tileX &&
    tileX < CITY_01_ARENA_VISUAL.tileX + CITY_01_ARENA_VISUAL.tileW
  );
}

export type ArenaPulpitDef = {
  readonly id: string;
  readonly label: string;
  readonly tileX: number;
  readonly tileY: number;
};

/** Púlpitos frontais do palco — interação de torneio/aposta. */
export const CITY_01_ARENA_PULPITS: readonly ArenaPulpitDef[] = [
  {
    id: 'arena_pulpit_west',
    label: 'Púlpito Oeste',
    tileX: CITY_01_ARENA_VISUAL.tileX + 1,
    tileY: CITY_01_ARENA_VISUAL.tileY + CITY_01_ARENA_VISUAL.tileH - 1,
  },
  {
    id: 'arena_pulpit_center',
    label: 'Púlpito Central',
    tileX: CITY_01_ARENA_CORE.tileX,
    tileY: CITY_01_ARENA_VISUAL.tileY + CITY_01_ARENA_VISUAL.tileH - 1,
  },
  {
    id: 'arena_pulpit_east',
    label: 'Púlpito Leste',
    tileX: CITY_01_ARENA_VISUAL.tileX + CITY_01_ARENA_VISUAL.tileW - 2,
    tileY: CITY_01_ARENA_VISUAL.tileY + CITY_01_ARENA_VISUAL.tileH - 1,
  },
] as const;

/** Monitor de ranking — ao lado oeste da arena principal. */
export const CITY_01_ARENA_RANKING_MONITOR = {
  id: 'arena_ranking_monitor',
  label: 'Monitor de Ranking',
  tileX: CITY_01_ARENA_VISUAL.tileX - 1,
  tileY: CITY_01_ARENA_VISUAL.tileY + 1,
  tileW: 1,
  tileH: 2,
} as const;

/** Estande de Tiro / Simulador de Refração — topo direito da cidade. */
export const CITY_01_REFRACTION_BOOTH = {
  id: 'refraction_booth',
  label: 'Estande de Refração',
  tileX: 30,
  tileY: 2,
  tileW: 7,
  tileH: 4,
} as const;

/** Corredor E–O — liga spine comercial ao ramal do estande. */
export const CITY_01_REFRACTION_BOOTH_ROAD_EW = {
  tileX: 24,
  tileY: 8,
  tileW: 12,
  tileH: 3,
} as const;

/** Ramal N–S — sobe do corredor até a entrada do estande. */
export const CITY_01_REFRACTION_BOOTH_ROAD_NS = {
  tileX: 32,
  tileY: 5,
  tileW: 3,
  tileH: 6,
} as const;

/** Instrutor do desafio de mira — imediatamente à frente da barraquinha (porta sul). */
export const CITY_01_REFRACTION_BOOTH_INSTRUCTOR = {
  tileX: 33,
  tileY: 7,
} as const;

export function isCity01RefractionBoothRoadTile(tileX: number, tileY: number): boolean {
  return (
    tileRectContains(CITY_01_REFRACTION_BOOTH_ROAD_EW, tileX, tileY) ||
    tileRectContains(CITY_01_REFRACTION_BOOTH_ROAD_NS, tileX, tileY)
  );
}

/** Direção do jogador ao configurar aposta — voltado ao público (sul). */
export const ARENA_PULPIT_AUDIENCE_FACING = 'south' as const;

/** Placeholders de prédios — protótipo visual (somente cliente). Arena = chão, não estrutura 3D. */
export const CITY_01_STRUCTURE_DEFS: readonly City01StructureDef[] = [
  { id: 'mercenario_house', label: 'CASA MERCENÁRIO', tileX: 4, tileY: 9, tileW: 4, tileH: 3 },
  { id: 'alquimista_house', label: 'LABORATÓRIO', tileX: 9, tileY: 9, tileW: 4, tileH: 3 },
  { id: 'anciao_house', label: 'CASA DO ANCIÃO', tileX: 4, tileY: 4, tileW: 5, tileH: 4 },
  { id: 'food_block', label: 'BARRAQUINHAS', tileX: 22, tileY: 11, tileW: 5, tileH: 4 },
  { id: 'market_block', label: 'MERCADO', tileX: 28, tileY: 11, tileW: 7, tileH: 5 },
  { id: 'ferreiro_house', label: 'CASA DO FERREIRO', tileX: 22, tileY: 24, tileW: 4, tileH: 3 },
  { id: 'vendedor_house', label: 'LOJA NPC', tileX: 27, tileY: 24, tileW: 4, tileH: 3 },
  { id: 'banqueiro_house', label: 'BANCO', tileX: 32, tileY: 24, tileW: 4, tileH: 3 },
  { id: 'refraction_booth', label: 'ESTANDE DE REFRAÇÃO', tileX: 30, tileY: 2, tileW: 7, tileH: 4 },
];

export function isCity01MainSpineTile(tileX: number, tileY: number): boolean {
  return (
    tileX >= CITY_01_ROAD_X_MIN &&
    tileX <= CITY_01_ROAD_X_MAX &&
    tileY >= CITY_01_ROAD_NORTH_Y &&
    tileY <= CITY_01_ROAD_SOUTH_Y
  );
}

export function isCity01EastWestBranchTile(tileX: number, tileY: number): boolean {
  const westEnd = CITY_01_RESIDENTIAL_ZONE.tileX;
  const eastEnd = CITY_01_COMMERCE_ZONE.tileX + CITY_01_COMMERCE_ZONE.tileW - 1;
  return (
    tileY >= CITY_01_ROAD_Y_MIN &&
    tileY <= CITY_01_ROAD_Y_MAX &&
    tileX >= westEnd &&
    tileX <= eastEnd
  );
}

export function isCity01ResidentialSpineTile(tileX: number, tileY: number): boolean {
  return zoneContains(CITY_01_RESIDENTIAL_SPINE, tileX, tileY);
}

export function isCity01CommerceSpineTile(tileX: number, tileY: number): boolean {
  return zoneContains(CITY_01_COMMERCE_SPINE, tileX, tileY);
}

export function isCity01RoadNetworkTile(tileX: number, tileY: number): boolean {
  return (
    isCity01MainSpineTile(tileX, tileY) ||
    isCity01EastWestBranchTile(tileX, tileY) ||
    isCity01ResidentialSpineTile(tileX, tileY) ||
    isCity01CommerceSpineTile(tileX, tileY) ||
    isCity01RefractionBoothRoadTile(tileX, tileY)
  );
}

export function zoneContains(rect: City01ZoneRect, tileX: number, tileY: number): boolean {
  return tileRectContains(rect, tileX, tileY);
}

export function tileRectContains(
  rect: Pick<City01ZoneRect, 'tileX' | 'tileY' | 'tileW' | 'tileH'>,
  tileX: number,
  tileY: number,
): boolean {
  return (
    tileX >= rect.tileX &&
    tileX < rect.tileX + rect.tileW &&
    tileY >= rect.tileY &&
    tileY < rect.tileY + rect.tileH
  );
}
