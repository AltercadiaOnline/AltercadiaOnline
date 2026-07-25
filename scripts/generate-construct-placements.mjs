#!/usr/bin/env node
/**
 * Gera placements Construct → TypeScript (única fonte de coords).
 * Roda após sync/prepare quando public/construct-world/data.json está pronto.
 *
 * Saídas:
 *   constructNpcPlacements.generated.ts
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

const MARKER_TO_NPC = {
  npc_anciao_cael: 'anciao_cael',
  npc_banqueiro: 'banqueiro',
  npc_ferreiro: 'ferreiro',
  npc_alquimista: 'alquimista',
  npc_vendedor: 'vendedor',
  npc_treinador_pet: 'treinador_zeno',
  npc_mestre_trilhas: 'mestre_trilhas',
  npc_mercenario: 'mercenario',
  computador_arena: 'computador_arena',
  computador_marketplace: 'computador_marketplace',
  computador_zona1: 'computador_zona1',
  pulpito: 'combate_pvp',
  combate_pvp: 'combate_pvp',
};

/** NPCs obrigatórios no export — sync falha se faltar. */
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

const REQUIRED_PORTAL_IDS = ['city_portal_north', 'farm_portal_south'];

const PORTAL_IDS = new Set(REQUIRED_PORTAL_IDS);

const SPAWN_MARKER_TO_CREATURE = {
  spawn_rato: 'rat',
  spawn_corvo: 'crow',
  spawn_cachorro: 'wild_dog',
  spawn_morcego: 'bat',
  spawn_aranha: 'spider',
};

const LAYOUT_TO_MAP = {
  cidade_01: 'city_01',
  zonabeco1: 'farm_zone_01',
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

const byNpc = new Map();
const byPortal = new Map();
const bySpawnType = new Map();
const byPlayerSpawn = new Map();

for (const layout of layouts) {
  const layoutName = layout[0];
  const mapId = LAYOUT_TO_MAP[layoutName];
  if (!mapId) continue;
  const instances = layout[10][0][14];
  for (const inst of instances) {
    const wi = inst[0];
    const typeName = objectTypes[inst[1]];
    const vars = Array.isArray(inst[3]) ? inst[3] : [];

    const npcId = MARKER_TO_NPC[typeName];
    if (npcId) {
      const entry = {
        npcId,
        mapId,
        constructX: Math.round(wi[0]),
        constructY: Math.round(wi[1]),
        w: Math.round(wi[3]),
        h: Math.round(wi[4]),
        typeName,
      };
      const prev = byNpc.get(npcId);
      if (!prev || entry.w * entry.h < prev.w * prev.h) {
        byNpc.set(npcId, entry);
      }
    }

    const portalId = vars.find((v) => PORTAL_IDS.has(String(v)));
    if (portalId && (typeName === 'a' || /portal|tele/i.test(typeName))) {
      const expectedMap = portalId === 'city_portal_north' ? 'city_01' : 'farm_zone_01';
      if (mapId !== expectedMap) continue;
      byPortal.set(portalId, {
        portalId,
        mapId,
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
        markerType: typeName,
        creatureId,
        constructX: Math.round(wi[0]),
        constructY: Math.round(wi[1]),
      });
      bySpawnType.set(typeName, list);
    }
  }
}

if (!byPlayerSpawn.has('city_01')) {
  fail('spawn_players ausente em cidade_01 (obrigatório para spawn seguro)');
}

for (const id of REQUIRED_NPC_IDS) {
  if (!byNpc.has(id)) {
    fail(`NPC obrigatório ausente no Construct: ${id} (adicione o marker e reexporte)`);
  }
}
for (const id of REQUIRED_PORTAL_IDS) {
  if (!byPortal.has(id)) {
    fail(`Portal obrigatório ausente no Construct: ${id}`);
  }
}

const npcLines = [...byNpc.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(
    ([npcId, e]) =>
      `  ${npcId}: { mapId: '${e.mapId}', constructX: ${e.constructX}, constructY: ${e.constructY} }, // ${e.typeName} ${e.w}x${e.h}`,
  )
  .join('\n');

writeFileSync(
  path.join(outDir, 'constructNpcPlacements.generated.ts'),
  `${header('NPCs')}
import type { ConstructNpcPlacement } from './constructNpcPlacements.js';

export const CONSTRUCT_NPC_PLACEMENTS_GENERATED: Readonly<
  Record<string, ConstructNpcPlacement>
> = {
${npcLines}
};
`,
);

const portalLines = [...byPortal.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(
    ([portalId, e]) =>
      `  ${portalId}: { mapId: '${e.mapId}', portalId: '${portalId}', constructX: ${e.constructX}, constructY: ${e.constructY}, widthPx: ${e.w}, heightPx: ${e.h} }, // ${e.typeName}`,
  )
  .join('\n');

writeFileSync(
  path.join(outDir, 'constructPortalPlacements.generated.ts'),
  `${header('portais')}
import type { ConstructPortalPlacement } from './constructPortalPlacements.js';

export const CONSTRUCT_PORTAL_PLACEMENTS_GENERATED: Readonly<
  Record<'city_portal_north' | 'farm_portal_south', ConstructPortalPlacement>
> = {
${portalLines}
};
`,
);

const spawnRows = [];
for (const typeName of [...bySpawnType.keys()].sort()) {
  const list = bySpawnType.get(typeName);
  list.forEach((e, index) => {
    spawnRows.push(
      `  { mapId: '${e.mapId}', markerType: '${e.markerType}', creatureId: '${e.creatureId}', constructX: ${e.constructX}, constructY: ${e.constructY}, index: ${index} },`,
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
      `  ${mapId}: { mapId: '${mapId}', constructX: ${e.constructX}, constructY: ${e.constructY}, widthPx: ${e.w}, heightPx: ${e.h} }, // ${e.typeName}`,
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

const props = spawnSync(
  process.execPath,
  [path.join(root, 'scripts', 'extract-construct-collidable-props.mjs')],
  { cwd: root, stdio: 'inherit' },
);
if (props.status !== 0) {
  process.exit(props.status ?? 1);
}

console.log('[generate-construct-placements] OK');
console.log(`  NPCs    → ${byNpc.size} (obrigatórios ${REQUIRED_NPC_IDS.length})`);
console.log(`  Portais → ${byPortal.size}`);
console.log(`  Spawns  → ${spawnRows.length}`);
console.log(`  Player  → ${byPlayerSpawn.size} mapa(s)`);
