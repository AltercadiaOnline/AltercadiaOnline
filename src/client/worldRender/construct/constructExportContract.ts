import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import type { MapId } from '../../../shared/world/mapRegistry.js';
import { WORLD_TERMINAL_IDS } from '../../../shared/world/worldTerminalCatalog.js';
import { CONSTRUCT_LAYOUT_BY_MAP_ID } from './constructMapLayoutAlias.js';

/**
 * Contrato do export Construct enxuto (Tilemap + poucos markers).
 *
 * Render: prepare/audit forçam WebGL-only + viewport 640×360 + sampling nearest
 * + gpu high-performance (`project[10..14,34]`). Bridge DOM trava dpr=1.
 * WebGPU no export HTML5 pode deixar canvas preto / timeout (AMD).
 *
 * O runtime Altercadia NÃO depende de objectTypes de terreno/prop.
 * Após um novo export, sprites mortos (ruas, calçadas, casas… no Construct)
 * podem ser removidos sem quebrar o jogo — só layouts + bridge import importam.
 */

export const CONSTRUCT_EXPORT_CONTRACT_VERSION = 2 as const;

/** Arquivos obrigatórios no export HTML5 (public/construct-world/). */
export const CONSTRUCT_EXPORT_REQUIRED_FILES = [
  'index.html',
  'data.json',
  'style.css',
  'appmanifest.json',
  'workermain.js',
] as const;

/** Pastas obrigatórias no export HTML5. */
export const CONSTRUCT_EXPORT_REQUIRED_DIRS = ['scripts', 'images'] as const;

/**
 * Layouts obrigatórios no projeto Construct.
 * Nomes devem bater com `goToLayout` / CONSTRUCT_LAYOUT_BY_MAP_ID.
 */
export const CONSTRUCT_REQUIRED_LAYOUTS = [
  CONSTRUCT_LAYOUT_BY_MAP_ID.city_01,
  CONSTRUCT_LAYOUT_BY_MAP_ID.farm_zone_01,
] as const;

/** Aceitos no data.json do export (nome atual + legado). */
export const CONSTRUCT_ACCEPTED_LAYOUT_NAMES: Readonly<Record<string, readonly string[]>> = {
  cidade_01: ['cidade_01'],
  zonabeco1: ['zonabeco1', 'beco_dos_fundos_zona1'],
};

/** Tamanhos oficiais dos layouts (px). Grid snap 32. */
export const CONSTRUCT_LAYOUT_SIZE_PX: Readonly<
  Record<(typeof CONSTRUCT_REQUIRED_LAYOUTS)[number], { width: number; height: number }>
> = {
  cidade_01: {
    width: DESIGN_CONFIG.MAP.WIDTH_PX,
    height: DESIGN_CONFIG.MAP.HEIGHT_PX,
  },
  /** Layout vivo no export — não forçar 20×60 Tiled. */
  zonabeco1: {
    width: 860,
    height: 2400,
  },
};

/**
 * Markers opcionais no Construct (décor / âncora visual).
 * Gameplay usa NPC_REGISTRY + overlay — ausência de marker NÃO quebra o jogo.
 */
export const CONSTRUCT_OPTIONAL_MARKERS = [
  'spawn_players',
  'spawn_rato',
  'spawn_corvo',
  'spawn_cachorro',
  'spawn_morcego',
  'spawn_aranha',
  WORLD_TERMINAL_IDS.ARENA,
  WORLD_TERMINAL_IDS.COMBATE_PVP,
  WORLD_TERMINAL_IDS.ZONE_1,
  WORLD_TERMINAL_IDS.MARKETPLACE,
] as const;

/**
 * ObjectTypes que eram terreno/prop por sprite — candidatos a remoção
 * no próximo export Tilemap. Não são lidos pelo runtime Altercadia.
 */
export const CONSTRUCT_DEAD_AFTER_TILEMAP_EXPORT = [
  'ruas',
  'ruas2',
  'tijolos',
  'calçada1',
  'calçada2',
  'calçada3',
  'calçada4',
  'calçada5',
  'alambrado1',
  'alambrado2',
  'cercaesquerdo',
  'cercareta',
  'cerdaDireito',
  'bueiro',
  'placa1',
  'lixo',
  'banco',
  'banco2',
  'poste',
  'poste2',
  'area_pet_1',
  'area_pet_2',
  'pulpito',
  'arbustro',
  'arbustro_2',
  'arvore_rosa',
  'barraquinha_mercado_01',
  'barraquinha_mercado_2',
  'barracaDeAlquimia',
  'casa_01',
  'casa_2',
  'casa_3',
  'casa_4',
  'bateria',
  'pedra',
  'telao_arena',
  'npc_anciao_cael',
  'npc_banqueiro',
  'npc_treinador_pet',
  'npc_ferreiro',
  'npc_alquimista',
  'npc_vendedor',
  'npc_vendedor2',
  'npc_mestre_trilhas',
] as const;

export type ConstructLeanExportGuide = {
  readonly version: typeof CONSTRUCT_EXPORT_CONTRACT_VERSION;
  readonly tileSize: number;
  readonly preferredTerrain: 'Tilemap';
  readonly layouts: typeof CONSTRUCT_REQUIRED_LAYOUTS;
  readonly optionalMarkers: typeof CONSTRUCT_OPTIONAL_MARKERS;
  readonly note: string;
};

export const CONSTRUCT_LEAN_EXPORT_GUIDE: ConstructLeanExportGuide = {
  version: CONSTRUCT_EXPORT_CONTRACT_VERSION,
  tileSize: DESIGN_CONFIG.TILE.SIZE,
  preferredTerrain: 'Tilemap',
  layouts: CONSTRUCT_REQUIRED_LAYOUTS,
  optionalMarkers: CONSTRUCT_OPTIONAL_MARKERS,
  note:
    'Terreno = Tilemap 32×32. Props grandes = poucos Sprites. '
    + 'Player/NPCs/criaturas = overlay Altercadia. '
    + 'Sync: npm run sync:construct (apaga public/construct-world e copia o export novo).',
};

export function constructLayoutIdForMap(mapId: MapId): string {
  return CONSTRUCT_LAYOUT_BY_MAP_ID[mapId] ?? mapId;
}
