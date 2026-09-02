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
import { ZONE_DOMAIN_TERMINAL_CATALOG } from './zoneDomainTerminals.js';
import { hasGeneratedConstructNpcPlacement } from './constructNpcPlacements.js';

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

/** Contacts de contrato — spawn só depois do marker Construct. */
const QUEST_CONTACT_NPCS: readonly NpcRegistryEntry[] = [
  {
    id: 'operario_linha4',
    name: 'Operário da Linha 4',
    level: 8,
    sprite: 'line_worker',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: 'O implante travou, mas o dump do código ainda está aqui. Rápido — antes que a patrulha volte.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'contrabandista',
    name: 'Contrabandista',
    level: 12,
    sprite: 'smuggler',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: 'As chaves estão comigo. Tira daqui antes dos capangas voltarem.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'receptador',
    name: 'Receptador',
    level: 18,
    sprite: 'fence',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: 'Relógio quente, preço frio. Não pergunto de onde veio.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
];

/** NPCs de ambiente — multi-spawn; mecânica de quest/interação vem depois. */
const AMBIENT_NPC_ARCHETYPES: readonly NpcRegistryEntry[] = [
  {
    id: 'humano_1',
    name: 'Morador',
    level: 5,
    sprite: 'citizen',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: '…',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'humano_2',
    name: 'Transeunte',
    level: 6,
    sprite: 'passerby',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: '…',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'mercador_rua',
    name: 'Mercador de Rua',
    level: 10,
    sprite: 'street_vendor',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: 'Oferta do dia — sem nota fiscal, sem perguntas.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'tecnico_manutencao',
    name: 'Técnico de Manutenção',
    level: 14,
    sprite: 'maintenance_tech',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: 'Painel aberto, fio solto. Se queimar, não fui eu.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'membro_gang_rosa',
    name: 'Membro da Gang Rosa',
    level: 16,
    sprite: 'pink_gang',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: 'Território marcado. Olha, mas não encosta.',
    dimensions: DESIGN_NPC_DIMENSIONS,
  },
  {
    id: 'cao_robo',
    name: 'Cão-Robô',
    level: 4,
    sprite: 'robot_dog',
    mapId: CITY_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: '*bip* Patrulha local. Unidade ociosa.',
    dimensions: DESIGN_NPC_DIMENSIONS,
    collidable: false,
  },
];

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
    actionType: NpcActionType.OPEN_NPC_VENDOR,
    dialogue: 'Contratos por faixa de nível e sprays táticos. Assina no quadro — eu não vendo heroísmo grátis.',
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
    dialogue: 'Computador da Arena — placar e estrutura do PvP ranqueado (cidade 01).',
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
    name: 'Terminal Zona 1 — Entrada',
    level: 1,
    sprite: 'terminal',
    mapId: FARM_ZONE_01_ID,
    ...CONSTRUCT_POS,
    actionType: NpcActionType.DIALOG,
    dialogue: 'Terminal de entrada do Beco — bypass para liberar Z1A.',
    dimensions: DESIGN_NPC_DIMENSIONS,
    featured: true,
    collidable: false,
  },
  ...ZONE_DOMAIN_TERMINAL_CATALOG.filter(
    (gate) =>
      gate.terminalId !== WORLD_TERMINAL_IDS.ZONE_1
      && hasGeneratedConstructNpcPlacement(gate.terminalId),
  ).map(
    (gate) =>
      ({
        id: gate.terminalId,
        name: gate.label,
        level: 1,
        sprite: 'terminal',
        mapId: FARM_ZONE_01_ID,
        ...CONSTRUCT_POS,
        actionType: NpcActionType.DIALOG,
        dialogue: gate.dialogue,
        dimensions: DESIGN_NPC_DIMENSIONS,
        featured: true,
        collidable: false,
      }) as const,
  ),
  ...QUEST_CONTACT_NPCS.filter((npc) => hasGeneratedConstructNpcPlacement(npc.id)),
  ...AMBIENT_NPC_ARCHETYPES.filter((npc) => hasGeneratedConstructNpcPlacement(npc.id)),
] as const;

export const NPC_REGISTRY_WITH_LORE: readonly NpcRegistryEntry[] = NPC_REGISTRY.map(withLoreGreeting);

export function getResolvedNpcRegistry(): readonly NpcRegistryEntry[] {
  return resolveNpcRegistryEntries(NPC_REGISTRY_WITH_LORE);
}

export { resolveNpcRegistryEntries };
