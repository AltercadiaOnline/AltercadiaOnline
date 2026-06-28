import { DESIGN_NPC_DIMENSIONS, type SpriteDimensions } from '../../config/spriteDimensions.js';
import {
  CITY_01_ARENA_CORE,
  CITY_01_ARENA_PULPITS,
  CITY_01_ARENA_VISUAL,
  CITY_01_REFRACTION_BOOTH_INSTRUCTOR,
} from './maps/city01LayoutConstants.js';
import { CITY_01_ID } from './maps/city01.js';
import type { MapId } from './mapRegistry.js';
import { getNpcDefinition } from '../../assets/npcs/npcDefinition.js';
import { applyNpcBuildingAnchors, resolveNpcRegistryEntries } from './npcBuildingAnchorsResolver.js';
import { resolveNpcGreeting } from './npcLoreCatalog.js';

export { getNpcDefinition, resolveNpcSpriteImageUrl } from '../../assets/npcs/npcDefinition.js';

export { DESIGN_NPC_DIMENSIONS };
export type NpcSpriteDimensions = SpriteDimensions;

/** Tipos de ação data-driven — mapeados para janelas HUD no cliente. */
export const NpcActionType = {
  DIALOG: 'DIALOG',
  OPEN_QUEST: 'OPEN_QUEST',
  OPEN_CRAFT: 'OPEN_CRAFT',
  OPEN_MARKET: 'OPEN_MARKET',
  OPEN_BANK: 'OPEN_BANK',
  OPEN_NPC_VENDOR: 'OPEN_NPC_VENDOR',
  OPEN_LAB_SHOP: 'OPEN_LAB_SHOP',
  OPEN_PET_SHOP: 'OPEN_PET_SHOP',
  OPEN_TOURNAMENT_BET: 'OPEN_TOURNAMENT_BET',
  OPEN_REFRACTION_BOOTH: 'OPEN_REFRACTION_BOOTH',
} as const;

export type NpcActionType = (typeof NpcActionType)[keyof typeof NpcActionType];

export type NpcRegistryEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly sprite: string;
  readonly mapId: MapId;
  readonly tileX: number;
  readonly tileY: number;
  readonly actionType: NpcActionType;
  readonly dialogue: string;
  /** Contrato de escala — 35×54 (igual ao jogador). */
  readonly dimensions: NpcSpriteDimensions;
  /** Destaque visual (ícone ★ acima da nametag). */
  readonly featured?: boolean;
};

/** Raio de interação em tiles (distância euclidiana centro-a-centro). */
export const NPC_INTERACTION_RADIUS_TILES = 1.5;

function withLoreGreeting(entry: NpcRegistryEntry): NpcRegistryEntry {
  return {
    ...entry,
    dialogue: resolveNpcGreeting(entry.id, entry.dialogue),
  };
}

/** Observador da arena — centralizado no eixo X, um tile acima do visual compacto. */
export const ANCIAO_CAEL_ARENA_TILE = {
  tileX: CITY_01_ARENA_CORE.tileX,
  tileY: CITY_01_ARENA_VISUAL.tileY - 1,
} as const;

/**
 * Registro autoritativo de NPCs — data-driven.
 * Posições em tiles da Cidade 01 (40×40 blocos @ 32px).
 */
export const NPC_REGISTRY: readonly NpcRegistryEntry[] = [
  {
    id: 'anciao_cael',
    name: 'Ancião Cael',
    level: 50,
    sprite: 'elder',
    mapId: CITY_01_ID,
    tileX: ANCIAO_CAEL_ARENA_TILE.tileX,
    tileY: ANCIAO_CAEL_ARENA_TILE.tileY,
    actionType: NpcActionType.DIALOG,
    dialogue: 'Bem-vindo a Altercadia, viajante.',
    dimensions: DESIGN_NPC_DIMENSIONS,
    featured: true,
  },
  {
    id: 'mercenario',
    name: 'Mercenário',
    level: 35,
    sprite: 'mercenary',
    mapId: CITY_01_ID,
    tileX: 10,
    tileY: 17,
    actionType: NpcActionType.OPEN_QUEST,
    dialogue: 'Tenho contratos perigosos para quem tiver coragem.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'ferreiro',
    name: 'Ferreiro',
    level: 25,
    sprite: 'blacksmith',
    mapId: CITY_01_ID,
    /** Fallback — posição efetiva via SERVICE_NPC_ANCHORS → ferreiro_house. */
    tileX: 24,
    tileY: 20,
    actionType: NpcActionType.OPEN_CRAFT,
    dialogue: 'Posso forjar equipamentos se trouxer os materiais.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'vendedor',
    name: 'Vendedor',
    level: 20,
    sprite: 'merchant',
    mapId: CITY_01_ID,
    /** Fallback — posição efetiva via SERVICE_NPC_ANCHORS → vendedor_house. */
    tileX: 28,
    tileY: 20,
    actionType: NpcActionType.OPEN_NPC_VENDOR,
    dialogue: 'Ofertas do dia — VOLTS aceitos.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'alquimista',
    name: 'Alquimista',
    level: 28,
    sprite: 'alchemist',
    mapId: CITY_01_ID,
    tileX: 10,
    tileY: 12,
    actionType: NpcActionType.OPEN_LAB_SHOP,
    dialogue: 'Poções, tônicos e catalisadores dimensionais.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'treinador_zeno',
    name: 'Treinador Zeno',
    level: 32,
    sprite: 'trainer',
    mapId: CITY_01_ID,
    tileX: 14,
    tileY: 14,
    actionType: NpcActionType.OPEN_PET_SHOP,
    dialogue: 'Gato ou Cachorro Dimensional — escolha seu parceiro tático.',
    dimensions: DESIGN_NPC_DIMENSIONS,
    featured: true,
  },
  {
    id: 'banqueiro',
    name: 'Banqueiro',
    level: 15,
    sprite: 'banker',
    mapId: CITY_01_ID,
    /** Fallback — posição efetiva via SERVICE_NPC_ANCHORS → banqueiro_house. */
    tileX: 32,
    tileY: 20,
    actionType: NpcActionType.OPEN_BANK,
    dialogue: 'Seus VOLTS estão seguros conosco.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'terminal_mercado',
    name: 'Terminal de Trocas',
    level: 1,
    sprite: 'terminal',
    mapId: CITY_01_ID,
    /** Fallback — posição efetiva via SERVICE_NPC_ANCHORS → market_block. */
    tileX: 31,
    tileY: 16,
    actionType: NpcActionType.OPEN_MARKET,
    dialogue: 'Mercado global — troque Alter Coins e consulte ofertas.',
    dimensions: DESIGN_NPC_DIMENSIONS,
    featured: true,
  },
  {
    id: 'instrutor_refraction',
    name: 'Instrutor Kael',
    level: 18,
    sprite: 'instructor',
    mapId: CITY_01_ID,
    tileX: CITY_01_REFRACTION_BOOTH_INSTRUCTOR.tileX,
    tileY: CITY_01_REFRACTION_BOOTH_INSTRUCTOR.tileY,
    actionType: NpcActionType.OPEN_REFRACTION_BOOTH,
    dialogue: 'Quer participar do desafio de mira ao alvo?',
    dimensions: DESIGN_NPC_DIMENSIONS,
    featured: true,
  },
  {
    id: 'mestre_trilhas',
    name: 'Mestre de Trilhas',
    level: 40,
    sprite: 'elder',
    mapId: CITY_01_ID,
    tileX: ANCIAO_CAEL_ARENA_TILE.tileX + 3,
    tileY: ANCIAO_CAEL_ARENA_TILE.tileY,
    actionType: NpcActionType.DIALOG,
    dialogue: 'A trilha Marcos é um compromisso. Posso reiniciá-la — por um preço emocional.',
    dimensions: DESIGN_NPC_DIMENSIONS,
    featured: true,
  },
  ...CITY_01_ARENA_PULPITS.map((pulpit) => ({
    id: pulpit.id,
    name: pulpit.label,
    level: 1,
    sprite: 'pulpit' as const,
    mapId: CITY_01_ID,
    tileX: pulpit.tileX,
    tileY: pulpit.tileY,
    actionType: NpcActionType.OPEN_TOURNAMENT_BET,
    dialogue: 'Registre sua aposta no torneio.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  })),
] as const;

/** Registro com greetings da lore canônica aplicados. */
export const NPC_REGISTRY_WITH_LORE: readonly NpcRegistryEntry[] = NPC_REGISTRY.map(withLoreGreeting);

/** Registro com posições efetivas — NPCs de serviço ancorados ao edifício. */
export function getResolvedNpcRegistry(): readonly NpcRegistryEntry[] {
  return resolveNpcRegistryEntries(NPC_REGISTRY_WITH_LORE);
}

export { applyNpcBuildingAnchors, resolveNpcRegistryEntries };
