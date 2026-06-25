/**
 * Manifesto SSOT — props urbanos (Urban Pixel Art Detalhado).
 * Grid: 40×40 px · top-down levemente inclinado · sem sombra projetada no PNG.
 * Iluminação: canto superior direito (motor desenha sombra dinâmica).
 */
export const URBAN_ASSET_PUBLIC_BASE = '/assets/props/props';
/** Paleta urbana consistente — evitar saturação excessiva. */
export const URBAN_PALETTE = {
    outline: '#1e2024',
    concrete: '#6b6f75',
    concreteDark: '#4a4e54',
    concreteLight: '#8a8f96',
    brick: '#8b4a3a',
    brickDark: '#6b3530',
    asphalt: '#2e3238',
    metal: '#5a6270',
    metalDark: '#3d4450',
    metalLight: '#7a8494',
    rust: '#8b5a3c',
    rustDark: '#6b4028',
    neonTeal: '#4ac8b8',
    neonAmber: '#e8a848',
    neonMagenta: '#c878d8',
    wood: '#785638',
    woodDark: '#5a4028',
    hydrantRed: '#b4322e',
    extinguisherRed: '#c83830',
};
export const URBAN_PROP_SPECS = [
    {
        id: 'street_light',
        fileName: 'street_light.png',
        widthPx: 40,
        heightPx: 80,
        tileW: 1,
        tileH: 2,
        label: 'Poste',
    },
    {
        id: 'trash_can',
        fileName: 'trash_can.png',
        widthPx: 40,
        heightPx: 40,
        tileW: 1,
        tileH: 1,
        label: 'Lixeira',
    },
    {
        id: 'mailbox',
        fileName: 'mailbox.png',
        widthPx: 40,
        heightPx: 40,
        tileW: 1,
        tileH: 1,
        label: 'Correio',
    },
    {
        id: 'fire_hydrant',
        fileName: 'fire_hydrant.png',
        widthPx: 40,
        heightPx: 40,
        tileW: 1,
        tileH: 1,
        label: 'Hidrante',
    },
    {
        id: 'park_bench',
        fileName: 'park_bench.png',
        widthPx: 80,
        heightPx: 40,
        tileW: 2,
        tileH: 1,
        label: 'Banco',
    },
    {
        id: 'fire_extinguisher',
        fileName: 'fire_extinguisher.png',
        widthPx: 40,
        heightPx: 40,
        tileW: 1,
        tileH: 1,
        label: 'Extintor',
    },
    {
        id: 'graffiti_wall',
        fileName: 'graffiti_wall.png',
        widthPx: 40,
        heightPx: 40,
        tileW: 1,
        tileH: 1,
        label: 'Grafite',
    },
];
const specById = new Map(URBAN_PROP_SPECS.map((spec) => [spec.id, spec]));
/** URLs públicas — chave = assetKey usado pelo worldAssetImageLoader. */
export const URBAN_PROP_IMAGE_URLS = Object.fromEntries(URBAN_PROP_SPECS.map((spec) => [
    spec.id,
    `${URBAN_ASSET_PUBLIC_BASE}/${spec.fileName}`,
]));
export function getUrbanPropSpec(id) {
    const spec = specById.get(id);
    if (!spec)
        throw new Error(`[urbanAssetManifest] Prop desconhecido: ${id}`);
    return spec;
}
export function resolveUrbanPropImageUrl(assetKey) {
    return URBAN_PROP_IMAGE_URLS[assetKey] ?? null;
}
export function listUrbanPropIds() {
    return URBAN_PROP_SPECS.map((spec) => spec.id);
}
/**
 * Briefing para geração externa (IA / artista) — manter consistência com o motor.
 * Sombra projetada: NÃO incluir no PNG (motor desenha dinamicamente).
 */
export const URBAN_ASSET_GENERATION_BRIEF = [
    'Urban Pixel Art Detalhado — Altercadia',
    'Paleta: concreto #6b6f75, tijolo #8b4a3a, asfalto #2e3238, metal #5a6270, ferrugem #8b5a3c, néons suaves #4ac8b8/#e8a848/#c878d8',
    'Pixel art nítido, sem antialiasing, contornos escuros #1e2024',
    'Top-down ortogonal levemente inclinado, grid 40×40 px',
    'Resolução: múltiplos de 40px · alpha 100% transparente · sem padding morto',
    'Iluminação: canto superior direito em todos os objetos',
    'Sem sombra projetada no arquivo',
].join('\n');
