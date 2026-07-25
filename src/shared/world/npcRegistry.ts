import { DESIGN_NPC_DIMENSIONS, type SpriteDimensions } from '../../config/spriteDimensions.js';
import {
  CITY_01_COMBATE_PVP,
  CITY_01_COMPUTADOR_ARENA,
} from './maps/city01LayoutConstants.js';
import { CITY_01_ID } from './maps/city01.js';
import { FARM_ZONE_01_ID } from './maps/farm_zone_01.js';
import type { MapId } from './mapRegistry.js';
import { getNpcDefinition } from '../../assets/npcs/npcDefinition.js';
import { resolveNpcRegistryEntries } from './npcBuildingAnchorsResolver.js';
import { resolveNpcGreeting } from './npcLoreCatalog.js';
import { WORLD_TERMINAL_IDS } from './worldTerminalCatalog.js';

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
  OPEN_ARENA_COMPUTER: 'OPEN_ARENA_COMPUTER',
  OPEN_PVP_QUEUE: 'OPEN_PVP_QUEUE',
  OPEN_REFRACTION_BOOTH: 'OPEN_REFRACTION_BOOTH',
} as const;

export type NpcActionType = (typeof NpcActionType)[keyof typeof NpcActionType];

export type NpcRegistryEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly sprite: string;
  readonly mapId: MapId;
  /** Stub — posição efetiva vem do Construct via resolveNpcRegistryEntries. */
  readonly tileX: number;
  readonly tileY: number;
  readonly actionType: NpcActionType;
  readonly dialogue: string;
  readonly dimensions: NpcSpriteDimensions;
  readonly featured?: boolean;
  readonly worldX?: number;
  readonly worldY?: number;
  readonly collidable?: boolean;
};

export const NPC_INTERACTION_RADIUS_TILES = 1.5;

/** Placeholder de tile — sobrescrito por constructNpcPlacements.generated.ts */
const CONSTRUCT_POS = { tileX: 0, tileY: 0 } as const;

function withLoreGreeting(entry: NpcRegistryEntry): NpcRegistryEntry {
  return {
    ...entry,
    dialogue: resolveNpcGreeting(entry.id, entry.dialogue),
  };
}

/**
 * Registro de NPCs — identidade/ação/diálogo.
 * Posição: Construct markers (generate:construct-placements).
 * `instrutor_refraction` (Kael) removido do spawn até asset/entrada oficiais.
 */
export const NPC_REGISTRY: readonly NpcRegistryEntry[] = [
  {
    id: 'anciao_cael',
    name: 'Ancião Cael',
    level: 50,
    sprite: 'elder',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
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
    ...CONSTRUCT_POS,
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
    ...CONSTRUCT_POS,
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
    ...CONSTRUCT_POS,
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
    ...CONSTRUCT_POS,
    actionType: NpcActionType.OPEN_LAB_SHOP,
    dialogue: 'Poções, tônicos e catalisadores dimensionais.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'treinador_zeno',
    name: 'Treinadora Zena',
    level: 32,
    sprite: 'trainer',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
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
    ...CONSTRUCT_POS,
    actionType: NpcActionType.OPEN_BANK,
    dialogue: 'Seus VOLTS estão seguros conosco.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'computador_marketplace',
    name: 'Computador Marketplace',
    level: 1,
    sprite: 'terminal',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.OPEN_MARKET,
    dialogue: 'Marketplace P2P — vendas entre jogadores e ofertas ativas.',
    dimensions: DESIGN_NPC_DIMENSIONS,
    featured: true,
  },
  {
    id: 'mestre_trilhas',
    name: 'Mestre das Trilhas',
    level: 40,
    sprite: 'trail_master',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: 'A trilha Marcos é um compromisso. Posso reiniciá-la — por um preço emocional.',
    dimensions: DESIGN_NPC_DIMENSIONS,
    featured: true,
  },
  {
    id: CITY_01_COMPUTADOR_ARENA.id,
    name: CITY_01_COMPUTADOR_ARENA.label,
    level: 1,
    sprite: 'terminal',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.OPEN_ARENA_COMPUTER,
    dialogue: 'Computador da Arena — ranking PvP e hub da central.',
    dimensions: DESIGN_NPC_DIMENSIONS,
    featured: true,
  },
  {
    id: CITY_01_COMBATE_PVP.id,
    name: CITY_01_COMBATE_PVP.label,
    level: 1,
    sprite: 'terminal',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.OPEN_PVP_QUEUE,
    dialogue: 'Púlpito de PvP Rankeado — fila 1x1 para batalha ranqueada.',
    dimensions: DESIGN_NPC_DIMENSIONS,
    featured: true,
  },
  {
    id: WORLD_TERMINAL_IDS.ZONE_1,
    name: 'Computador Zona 1',
    level: 1,
    sprite: 'terminal',
    mapId: FARM_ZONE_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: 'Terminal de domínio do Beco dos Fundos — mecânicas da Zona 1 em breve.',
    dimensions: DESIGN_NPC_DIMENSIONS,
    featured: true,
    collidable: false,
  },
] as const;

export const NPC_REGISTRY_WITH_LORE: readonly NpcRegistryEntry[] = NPC_REGISTRY.map(withLoreGreeting);

export function getResolvedNpcRegistry(): readonly NpcRegistryEntry[] {
  return resolveNpcRegistryEntries(NPC_REGISTRY_WITH_LORE);
}

export { resolveNpcRegistryEntries };
