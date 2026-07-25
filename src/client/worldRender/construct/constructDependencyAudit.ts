/**
 * Auditoria — Construct = cena enxuta (Tilemap); overlay = entidades autoritativas.
 */

export const CONSTRUCT_DEPENDENCY_AUDIT = {
  onlineBoot: {
    status: 'ready',
    summary: 'ConstructWorldRuntime + iframe pan/câmera + entity overlay + postMessage bridge',
  },

  exportContract: {
    version: 2,
    preferredTerrain: 'Tilemap',
    requiredLayouts: ['cidade_01', 'zonabeco1'],
    layoutAliases: { beco_dos_fundos_zona1: 'zonabeco1' },
    optionalMarkers: [
      'spawn_players',
      'computador_arena',
      'combate_pvp',
      'computador_zona1',
      'computador_marketplace',
    ],
    notRequired: 'objectTypes de terreno/prop por sprite (ruas, calçadas, casas, npcs décor…)',
    sync: 'npm run sync:construct (wipe + copy + prepare + generate placements + audit)',
    prepare: 'npm run prepare:construct (bridge + WebGL policy + generate placements)',
    generate: 'npm run generate:construct-placements',
    audit: 'npm run audit:construct (falha se WebGPU/letterbox/viewport errados)',
  },

  layoutAlias: {
    city_01: 'cidade_01',
    farm_zone_01: 'zonabeco1',
    constructMarkers: {
      npc_treinador_pet: 'treinador_zeno',
      computador_marktplace: 'computador_marketplace',
      spawn_players: 'player_spawn',
    },
  },
  exportPath: {
    source: 'construct/altercadia-world/',
    runtime: 'public/construct-world/',
    syncScript: 'npm run sync:construct',
  },

  renderer: {
    policy: 'webgl-only',
    viewport: '640×360',
    sampling: 'nearest',
    gpuPowerPreference: 'high-performance',
    devicePixelRatio: 1,
    reason: 'WebGPU (AMD/drivers) → canvas preto / timeout layout; dpr=1 corta fill-rate HiDPI',
    enforce: 'prepare patch data.json + bridge kill-switch + export-meta probe',
  },

  collision: {
    status: 'construct-solid-props',
    flag: 'WORLD_LEGACY_COLLISION_ENABLED = false',
    props: 'Somente Solid do Construct → collisionPoly bake em constructCollidableProps.generated.ts',
    npcs: 'AABB Altercadia (npcAssetBundles / constructNpcCollisionHitbox) — não usa Solid do prop channel',
    creatures: 'Não bloqueiam movimento (encounter/adjacency only)',
    excludedFromPropChannel: 'npc_*, spawn_*, computador_*, pulpito, combate_pvp, tiles/rua',
    behavior: 'Bounds do mapa + registry (props polígono + NPC AABB)',
    spawn: 'NPCs + criaturas + spawn_players → *.generated.ts',
    generate: 'npm run generate:construct-placements (também no sync/prepare)',
  },

  assets: {
    npcBundles: 'public/assets/npcs/{bundle}/metadata.json',
    itemIcons: 'public/assets/items/{id}.png (npm run sync:item-icons)',
    missingNpcPlaceholder: 'humanoid procedural se faltar PNG; terminais usam computador_npc',
  },

  retired: {
    engines: ['phaser', 'tiled-map-runtime'],
    removedPaths: [
      'src/client/phaser/**',
      'src/config/maps/*PhaserMap.json',
      'src/config/maps/*TiledMap.json',
      'src/shared/world/tiled* (parse/placements)',
      'scripts/mirror-map-mund-export.ts',
    ],
    pendingAfterNextExport: [
      'imagens órfãs no export antigo — sync já limpa public/construct-world',
    ],
    removedClientPaint: [
      'city01PlaceholderLayout/Renderer',
      'city01VisualLayout',
      'farmZone01VisualLayout',
      'portalRenderer',
      'groundTileImageLoader',
    ],
  },
} as const;
