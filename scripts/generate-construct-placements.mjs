#!/usr/bin/env node
/**
 * Gera placements Construct → TypeScript (única fonte de coords).
 * Roda após sync/prepare quando public/construct-world/data.json está pronto.
 *
 * Saídas:
 *   constructNpcPlacements.generated.ts (+ instâncias multi-spawn)
 *   constructPortalPlacements.generated.ts
 *   constructCreatureSpawnPlacements.generated.ts
 *   constructPlayerSpawnPlacements.generated.ts
 *   constructCollidableProps.generated.ts (via extract-collidable)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'public', 'construct-world', 'data.json');
const outDir = path.join(root, 'src', 'shared', 'world');
const configDir = path.join(root, 'src', 'config');

/** @type {Record<string, string>} */
const MARKER_TO_NPC = JSON.parse(
  readFileSync(path.join(configDir, 'npcConstructMarkers.json'), 'utf8'),
);

/** @type {Record<string, string>} */
const QUEST_POI_MARKER_TO_ID = JSON.parse(
  readFileSync(path.join(configDir, 'questPoiConstructMarkers.json'), 'utf8'),
);

/** @type {Record<string, string>} */
const PORTAL_MARKER_TO_ID = JSON.parse(
  readFileSync(path.join(configDir, 'portalConstructMarkers.json'), 'utf8'),
);

/** NPCs obrigatórios no export — sync falha se faltar ao menos uma instância. */
const REQUIRED_NPC_IDS = [
  'anciao_cael',
  'mercenario',
  'banqueiro',
  'ferreiro',
  'vendedor',
  'alquimista',
  'treinador_zeno',
  'mestre_trilhas',
  'computador_arena',
  'computador_marketplace',
  'combate_pvp',
  'computador_zona1',
];

const REQUIRED_PORTAL_IDS = [
  'city_portal_north',
  'farm_portal_south',
  'farm_portal_z1_to_z1a',
  'farm_portal_z1a_to_z1',
  'farm_portal_z1a_to_z1b',
  'farm_portal_z1a_to_z1c',
];

const PORTAL_IDS = new Set([...REQUIRED_PORTAL_IDS, ...Object.values(PORTAL_MARKER_TO_ID)]);

const SPAWN_MARKER_TO_CREATURE = {
  spawn_rato: 'rat',
  spawn_corvo: 'crow',
  spawn_cachorro: 'wild_dog',
  spawn_morcego: 'bat',
  spawn_aranha: 'spider',
  spawn_agente_vortex: 'vortex_agent',
};

const LAYOUT_TO_MAP = {
  cidade_01: 'city_01',
  zonabeco1: 'farm_zone_01',
  zonabeco1a: 'farm_zone_01',
  zonabeco1b: 'farm_zone_01',
  zonabeco1c: 'farm_zone_01',
  beco_dos_fundos_zona1: 'farm_zone_01',
};

function fail(msg) {
  console.error(`[generate-construct-placements] FAIL — ${msg}`);
  process.exit(1);
}

function header(kind) {
  return `/** Auto-gerado por scripts/generate-construct-placements.mjs — NÃO editar.
 * Fonte: public/construct-world/data.json (${kind}).
 * Regenerar: npm run sync:construct | npm run prepare:construct | npm run generate:construct-placements
 */
`;
}

if (!existsSync(dataPath)) {
  fail(`data.json ausente: ${dataPath}`);
}

const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
const objectTypes = raw.project[3].map((ot) => ot[0]);
const layouts = raw.project[5];

/** @type {Map<string, Array<{ archetypeId: string, mapId: string, constructLayout: string, constructX: number, constructY: number, typeName: string, w: number, h: number }>>} */
const instancesByArchetype = new Map();
/** @type {Array<{ portalId: string, mapId: string, constructLayout: string, constructX: number, constructY: number, w: number, h: number, typeName: string }>} */
const portalInstances = [];
const bySpawnType = new Map();
const byPlayerSpawn = new Map();
/** @type {Array<{ poiId: string, mapId: string, constructLayout: string, constructX: number, constructY: number }>} */
const questPoiPlacements = [];

for (const layout of layouts) {
  const layoutName = layout[0];
  const mapId = LAYOUT_TO_MAP[layoutName];
  if (!mapId) continue;
  const instances = layout[10][0][14];
  for (const inst of instances) {
    const wi = inst[0];
    const typeName = objectTypes[inst[1]];
    const vars = Array.isArray(inst[3]) ? inst[3] : [];

    const archetypeId = MARKER_TO_NPC[typeName];
    if (archetypeId) {
      const entry = {
        archetypeId,
        mapId,
        constructLayout: layoutName,
        constructX: Math.round(wi[0]),
        constructY: Math.round(wi[1]),
        typeName,
        w: Math.round(wi[3]),
        h: Math.round(wi[4]),
      };
      const list = instancesByArchetype.get(archetypeId) ?? [];
      list.push(entry);
      instancesByArchetype.set(archetypeId, list);
    }

    const questPoiId = QUEST_POI_MARKER_TO_ID[typeName];
    if (questPoiId) {
      questPoiPlacements.push({
        poiId: questPoiId,
        mapId,
        constructLayout: layoutName,
        constructX: Math.round(wi[0]),
        constructY: Math.round(wi[1]),
      });
    }

    const portalFromMarker = PORTAL_MARKER_TO_ID[typeName];
    if (portalFromMarker) {
      portalInstances.push({
        portalId: portalFromMarker,
        mapId,
        constructLayout: layoutName,
        constructX: Math.round(wi[0]),
        constructY: Math.round(wi[1]),
        w: Math.round(wi[3]),
        h: Math.round(wi[4]),
        typeName,
      });
    }

    if (typeName === 'spawn_players' || typeName === 'player_spawn') {
      const entry = {
        mapId,
        constructLayout: layoutName,
        constructX: Math.round(wi[0]),
        constructY: Math.round(wi[1]),
        w: Math.round(wi[3]),
        h: Math.round(wi[4]),
        typeName,
      };
      const prev = byPlayerSpawn.get(mapId);
      if (!prev || entry.w * entry.h < prev.w * prev.h) {
        byPlayerSpawn.set(mapId, entry);
      }
    }

    const creatureId = SPAWN_MARKER_TO_CREATURE[typeName];
    if (creatureId && mapId === 'farm_zone_01') {
      const list = bySpawnType.get(typeName) ?? [];
      list.push({
        mapId,
        constructLayout: layoutName,
        markerType: typeName,
        creatureId,
        constructX: Math.round(wi[0]),
        constructY: Math.round(wi[1]),
      });
      bySpawnType.set(typeName, list);
    }
  }
}

/** @type {Array<{ instanceId: string, archetypeId: string, mapId: string, constructLayout: string, constructX: number, constructY: number }>} */
const npcInstances = [];

for (const archetypeId of [...instancesByArchetype.keys()].sort()) {
  const list = instancesByArchetype.get(archetypeId);
  list.sort(
    (a, b) =>
      a.constructLayout.localeCompare(b.constructLayout)
      || a.constructY - b.constructY
      || a.constructX - b.constructX,
  );
  list.forEach((entry, index) => {
    const instanceId = list.length === 1 ? archetypeId : `${archetypeId}#${index}`;
    npcInstances.push({
      instanceId,
      archetypeId,
      mapId: entry.mapId,
      constructLayout: entry.constructLayout,
      constructX: entry.constructX,
      constructY: entry.constructY,
    });
  });
}

if (!byPlayerSpawn.has('city_01')) {
  fail('spawn_players ausente em cidade_01 (obrigatório para spawn seguro)');
}

for (const id of REQUIRED_NPC_IDS) {
  if (!instancesByArchetype.has(id)) {
    fail(`NPC obrigatório ausente no Construct: ${id} (adicione o marker e reexporte)`);
  }
}
for (const id of REQUIRED_PORTAL_IDS) {
  if (!portalInstances.some((entry) => entry.portalId === id)) {
    fail(`Portal obrigatório ausente no Construct: ${id}`);
  }
}

/** Primeira instância por archetype — gates de registry legados. */
const npcLegacyLines = npcInstances
  .filter((inst, _idx, arr) => arr.findIndex((x) => x.archetypeId === inst.archetypeId) === _idx)
  .sort((a, b) => a.archetypeId.localeCompare(b.archetypeId))
  .map(
    (inst) =>
      `  ${inst.archetypeId}: { mapId: '${inst.mapId}', constructLayout: '${inst.constructLayout}', constructX: ${inst.constructX}, constructY: ${inst.constructY} },`,
  )
  .join('\n');

const npcInstanceLines = npcInstances
  .map(
    (inst) =>
      `  { instanceId: '${inst.instanceId}', archetypeId: '${inst.archetypeId}', mapId: '${inst.mapId}', constructLayout: '${inst.constructLayout}', constructX: ${inst.constructX}, constructY: ${inst.constructY} },`,
  )
  .join('\n');

writeFileSync(
  path.join(outDir, 'constructNpcPlacements.generated.ts'),
  `${header('NPCs')}
import type { ConstructNpcInstancePlacement, ConstructNpcPlacement } from './constructNpcPlacements.js';

/** Todas as instâncias — multi-spawn (ex.: humano_1#0, humano_1#1). */
export const CONSTRUCT_NPC_INSTANCES_GENERATED: readonly ConstructNpcInstancePlacement[] = [
${npcInstanceLines}
];

/** Primeira instância por archetype — compat gates / terminais. */
export const CONSTRUCT_NPC_PLACEMENTS_GENERATED: Readonly<
  Record<string, ConstructNpcPlacement>
> = {
${npcLegacyLines}
};
`,
);

const portalLines = portalInstances
  .sort(
    (a, b) =>
      a.portalId.localeCompare(b.portalId)
      || a.constructLayout.localeCompare(b.constructLayout),
  )
  .map(
    (e) =>
      `  { mapId: '${e.mapId}', portalId: '${e.portalId}', constructLayout: '${e.constructLayout}', constructX: ${e.constructX}, constructY: ${e.constructY}, widthPx: ${e.w}, heightPx: ${e.h} }, // ${e.typeName}`,
  )
  .join('\n');

writeFileSync(
  path.join(outDir, 'constructPortalPlacements.generated.ts'),
  `${header('portais')}
import type { ConstructPortalPlacement } from './constructPortalPlacements.js';

export const CONSTRUCT_PORTAL_INSTANCES_GENERATED: readonly ConstructPortalPlacement[] = [
${portalLines}
];
`,
);

const spawnRows = [];
for (const typeName of [...bySpawnType.keys()].sort()) {
  const list = bySpawnType.get(typeName);
  list.forEach((e, index) => {
    spawnRows.push(
      `  { mapId: '${e.mapId}', constructLayout: '${e.constructLayout}', markerType: '${e.markerType}', creatureId: '${e.creatureId}', constructX: ${e.constructX}, constructY: ${e.constructY}, index: ${index} },`,
    );
  });
}

writeFileSync(
  path.join(outDir, 'constructCreatureSpawnPlacements.generated.ts'),
  `${header('spawns Zona 1')}
import type { ConstructCreatureSpawnPlacement } from './constructCreatureSpawnPlacements.js';

export const CONSTRUCT_ZONE1_CREATURE_SPAWNS_GENERATED: readonly ConstructCreatureSpawnPlacement[] = [
${spawnRows.join('\n')}
];
`,
);

const playerSpawnLines = [...byPlayerSpawn.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(
    ([mapId, e]) =>
      `  ${mapId}: { mapId: '${mapId}', constructLayout: '${e.constructLayout}', constructX: ${e.constructX}, constructY: ${e.constructY}, widthPx: ${e.w}, heightPx: ${e.h} }, // ${e.typeName}`,
  )
  .join('\n');

writeFileSync(
  path.join(outDir, 'constructPlayerSpawnPlacements.generated.ts'),
  `${header('spawn jogador')}
import type { ConstructPlayerSpawnPlacement } from './constructPlayerSpawnPlacements.js';
import type { MapId } from './mapRegistry.js';

export const CONSTRUCT_PLAYER_SPAWN_PLACEMENTS_GENERATED: Readonly<
  Partial<Record<MapId, ConstructPlayerSpawnPlacement>>
> = {
${playerSpawnLines}
};
`,
);

const questPoiLines = questPoiPlacements
  .sort(
    (a, b) =>
      a.poiId.localeCompare(b.poiId)
      || a.constructY - b.constructY
      || a.constructX - b.constructX,
  )
  .map(
    (entry) =>
      `  { poiId: '${entry.poiId}', mapId: '${entry.mapId}', constructLayout: '${entry.constructLayout}', constructX: ${entry.constructX}, constructY: ${entry.constructY} },`,
  )
  .join('\n');

writeFileSync(
  path.join(outDir, 'constructQuestPoiPlacements.generated.ts'),
  `${header('quest POIs')}
import type { ConstructQuestPoiPlacement } from './constructQuestPoiPlacements.js';

export const CONSTRUCT_QUEST_POI_PLACEMENTS_GENERATED: readonly ConstructQuestPoiPlacement[] = [
${questPoiLines}
];
`,
);

const props = spawnSync(
  process.execPath,
  [path.join(root, 'scripts', 'extract-construct-collidable-props.mjs')],
  { cwd: root, stdio: 'inherit' },
);
if (props.status !== 0) {
  process.exit(props.status ?? 1);
}

console.log('[generate-construct-placements] OK');
console.log(`  NPCs    → ${npcInstances.length} instância(s), ${instancesByArchetype.size} archetype(s)`);
console.log(`  Portais → ${portalInstances.length}`);
console.log(`  Spawns  → ${spawnRows.length}`);
console.log(`  Player  → ${byPlayerSpawn.size} mapa(s)`);
console.log(`  Quest   → ${questPoiPlacements.length} POI(s)`);
