/**
 * Estruturas da Cidade 01 — footprints em tiles (32px) → PNG 1:1.
 * Chaves alinhadas a worldAssetImageLoader / city01PlaceholderLayout.
 */
export const STRUCTURE_ASSET_PUBLIC_BASE = '/assets/structures';
const TILE = 32;
export const STRUCTURE_ASSET_SPECS = [
    { id: 'casa_anciao', fileName: 'casa_anciao.png', tileW: 5, tileH: 4, widthPx: 5 * TILE, heightPx: 4 * TILE, label: 'Casa do Ancião' },
    { id: 'casa_mercenario', fileName: 'casa_mercenario.png', tileW: 4, tileH: 3, widthPx: 4 * TILE, heightPx: 3 * TILE, label: 'Casa Mercenário' },
    { id: 'casa_alquimista', fileName: 'casa_alquimista.png', tileW: 4, tileH: 3, widthPx: 4 * TILE, heightPx: 3 * TILE, label: 'Laboratório' },
    { id: 'food_stalls', fileName: 'food_stalls.png', tileW: 5, tileH: 4, widthPx: 5 * TILE, heightPx: 4 * TILE, label: 'Barraquinhas' },
    { id: 'market_hall', fileName: 'market_hall.png', tileW: 7, tileH: 5, widthPx: 7 * TILE, heightPx: 5 * TILE, label: 'Mercado' },
    { id: 'casa_ferreiro', fileName: 'casa_ferreiro.png', tileW: 4, tileH: 3, widthPx: 4 * TILE, heightPx: 3 * TILE, label: 'Casa do Ferreiro' },
    { id: 'casa_vendedor', fileName: 'casa_vendedor.png', tileW: 4, tileH: 3, widthPx: 4 * TILE, heightPx: 3 * TILE, label: 'Loja NPC' },
    { id: 'casa_banqueiro', fileName: 'casa_banqueiro.png', tileW: 4, tileH: 3, widthPx: 4 * TILE, heightPx: 3 * TILE, label: 'Banco' },
    { id: 'refraction_booth', fileName: 'refraction_booth.png', tileW: 7, tileH: 4, widthPx: 7 * TILE, heightPx: 4 * TILE, label: 'Estande Refração' },
    { id: 'arena_tournament', fileName: 'arena_tournament.png', tileW: 4, tileH: 4, widthPx: 4 * TILE, heightPx: 4 * TILE, label: 'Arena' },
    { id: 'tower_wing', fileName: 'tower_wing.png', tileW: 4, tileH: 3, widthPx: 4 * TILE, heightPx: 3 * TILE, label: 'Torre' },
    { id: 'tower_spire', fileName: 'tower_spire.png', tileW: 3, tileH: 2, widthPx: 3 * TILE, heightPx: 2 * TILE, label: 'Cúpula' },
];
export const STRUCTURE_IMAGE_URLS = Object.fromEntries(STRUCTURE_ASSET_SPECS.map((spec) => [
    spec.id,
    `${STRUCTURE_ASSET_PUBLIC_BASE}/${spec.fileName}`,
]));
