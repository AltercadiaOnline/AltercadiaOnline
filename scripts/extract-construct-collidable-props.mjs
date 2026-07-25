#!/usr/bin/env node
/**
 * Extrai props Solid do Construct (public/construct-world/data.json).
 *
 * Autoridade: objectTypes com behavior `solid` + collisionPoly do frame.
 * Exclui canais Altercadia (NPC / spawn / terminal / marker) — colisão deles é nossa.
 *
 * Regenerar: npm run generate:construct-placements
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'public', 'construct-world', 'data.json');
const outPath = path.join(root, 'src', 'shared', 'world', 'constructCollidableProps.generated.ts');

const LAYOUT_TO_MAP = {
  cidade_01: 'city_01',
  zonabeco1: 'farm_zone_01',
  beco_dos_fundos_zona1: 'farm_zone_01',
};

/**
 * Canais NÃO-prop — colisão/posição via placements NPC/spawn/portal.
 * Mesmo com Solid no Construct, não entram no registry de props.
 */
function isExcludedPropChannel(typeName) {
  if (typeName.startsWith('npc_')) return true;
  if (typeName.startsWith('spawn_')) return true;
  if (typeName.startsWith('ladrilhos')) return true;
  if (typeName.startsWith('rua')) return true;
  if (
    typeName === 'tijolos'
    || typeName === 'pulpito'
    || typeName === 'combate_pvp'
    || typeName === 'teletransporte_asset'
    || typeName === 'a'
  ) {
    return true;
  }
  if (typeName.startsWith('computador_')) return true;
  return false;
}

function hasSolidBehavior(objectType, solidBehaviorIds) {
  const behaviors = objectType[8];
  if (!Array.isArray(behaviors) || behaviors.length === 0) return false;
  return behaviors.some((b) => {
    if (!Array.isArray(b)) return false;
    if (solidBehaviorIds.has(b[1])) return true;
    const name = String(b[0] ?? '').toLowerCase();
    return name === 'sólido' || name === 'solido' || name === 'solid';
  });
}

/** Poly do frame 0 — coords relativas à origem Construct (já no formato do export). */
function readFrameCollisionPoly(objectType) {
  const anims = objectType[7];
  if (!Array.isArray(anims) || !anims[0]) return null;
  const frames = anims[0][7];
  if (!Array.isArray(frames) || !frames[0]) return null;
  const frame = frames[0];
  const poly = frame[11];
  if (!Array.isArray(poly) || poly.length < 6) return null;
  return poly;
}

/** Retângulo default Construct (origem relativa) quando não há collisionPoly. */
function defaultOriginRelativeRect(originX, originY) {
  return [-originX, -originY, 1 - originX, -originY, 1 - originX, 1 - originY, -originX, 1 - originY];
}

function transformPolyToWorld(poly, x, y, width, height, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const points = [];
  for (let i = 0; i + 1 < poly.length; i += 2) {
    let lx = poly[i] * width;
    let ly = poly[i + 1] * height;
    if (angleDeg) {
      const rx = lx * cos - ly * sin;
      const ry = lx * sin + ly * cos;
      lx = rx;
      ly = ry;
    }
    points.push({
      x: Math.round(x + lx),
      y: Math.round(y + ly),
    });
  }
  return points;
}

function boundsOf(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
const behaviorRegistry = raw.project[2] ?? [];
const solidBehaviorIds = new Set(
  behaviorRegistry.filter((b) => Array.isArray(b) && b[2] === 'solid').map((b) => b[0]),
);

const objectTypes = raw.project[3];
const solidTypeMeta = new Map();

for (const ot of objectTypes) {
  const name = ot[0];
  if (isExcludedPropChannel(name)) continue;
  if (!hasSolidBehavior(ot, solidBehaviorIds)) continue;
  solidTypeMeta.set(name, {
    poly: readFrameCollisionPoly(ot),
  });
}

const layouts = raw.project[5];
const rows = [];
const counts = new Map();
const warnedOrigins = new Set();

for (const layout of layouts) {
  const layoutName = layout[0];
  const mapId = LAYOUT_TO_MAP[layoutName];
  if (!mapId) continue;
  const instances = layout[10][0][14];
  for (const inst of instances) {
    const typeName = objectTypes[inst[1]]?.[0];
    if (!typeName || !solidTypeMeta.has(typeName)) continue;

    const wi = inst[0];
    const x = wi[0];
    const y = wi[1];
    const angleDeg = wi[2] ?? 0;
    const widthPx = wi[3];
    const heightPx = wi[4];
    const originX = wi[8] ?? 0.5;
    const originY = wi[9] ?? 0.5;

    if (
      !warnedOrigins.has(typeName)
      && (originX < -0.5 || originX > 1.5 || originY < -0.5 || originY > 1.5)
    ) {
      warnedOrigins.add(typeName);
      console.warn(
        `[extract-construct-collidable-props] WARN ${typeName}: origin (${originX}, ${originY}) fora de [0,1] — ` +
          `polígono segue o Construct; corrija o hotspot no editor se a colisão parecer deslocada.`,
      );
    }

    const meta = solidTypeMeta.get(typeName);
    const polyRel = meta.poly ?? defaultOriginRelativeRect(originX, originY);
    const polygon = transformPolyToWorld(polyRel, x, y, widthPx, heightPx, angleDeg);
    if (polygon.length < 3) continue;

    const bounds = boundsOf(polygon);
    const n = (counts.get(typeName) ?? 0) + 1;
    counts.set(typeName, n);

    rows.push({
      id: `${typeName}_${mapId}_${n}`,
      mapId,
      objectType: typeName,
      constructX: Math.round(x),
      constructY: Math.round(y),
      widthPx: Math.round(widthPx),
      heightPx: Math.round(heightPx),
      polygon,
      bounds,
    });
  }
}

function fmtPoly(points) {
  return `[${points.map((p) => `{x:${p.x},y:${p.y}}`).join(',')}]`;
}

function fmtBounds(b) {
  return `{x:${b.x},y:${b.y},width:${b.width},height:${b.height}}`;
}

const body = rows
  .map(
    (r) =>
      `  { id: '${r.id}', mapId: '${r.mapId}', objectType: '${r.objectType}', constructX: ${r.constructX}, constructY: ${r.constructY}, widthPx: ${r.widthPx}, heightPx: ${r.heightPx}, polygon: ${fmtPoly(r.polygon)}, bounds: ${fmtBounds(r.bounds)} },`,
  )
  .join('\n');

const solidNames = [...solidTypeMeta.keys()].sort().join(', ');

const file = `/** Auto-gerado por scripts/extract-construct-collidable-props.mjs — não editar à mão.
 * Fonte: props com behavior Solid no Construct + collisionPoly do frame.
 * Exclui NPC/spawn/terminal/marker (colisão Altercadia).
 * Solid types: ${solidNames || '(nenhum)'}
 */
import type { ConstructCollidablePropPlacement } from './constructCollidableProps.js';

export const CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS_GENERATED: readonly ConstructCollidablePropPlacement[] = [
${body}
];
`;

writeFileSync(outPath, file);
console.log(`[extract-construct-collidable-props] ${rows.length} solid props → ${outPath}`);
console.log(`  solid objectTypes: ${solidNames || '(nenhum)'}`);
for (const [k, v] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${k}: ${v}`);
}
