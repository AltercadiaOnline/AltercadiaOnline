/**
 * Auditoria 1:1 city_01_test.tmj ↔ city01PhaserMap.json
 * Uso: node scripts/audit-city01-mirror.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TILED_GID_MASK = 0x1fffffff;
const TILED_FLIP_H = 0x80000000;
const TILED_FLIP_V = 0x40000000;
const TILED_FLIP_D = 0x20000000;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmjPath = path.join(root, 'public/assets/map_mund/city_01_test.tmj');
const phaserPath = path.join(root, 'src/config/maps/city01PhaserMap.json');

const tmj = JSON.parse(readFileSync(tmjPath, 'utf8'));
const phaser = JSON.parse(readFileSync(phaserPath, 'utf8'));

function decodeGid(gid) {
  const raw = Number(gid);
  const real = raw & TILED_GID_MASK;
  const flags = raw & ~TILED_GID_MASK;
  return {
    raw,
    real,
    flipH: !!(flags & TILED_FLIP_H),
    flipV: !!(flags & TILED_FLIP_V),
    flipD: !!(flags & TILED_FLIP_D),
    hadFlags: raw !== real,
  };
}

function getObjectLayers(map) {
  return (map.layers ?? []).filter((layer) => layer.type === 'objectgroup');
}

function objKey(object, layerName) {
  const id = object.id ?? 'no-id';
  const name = object.name ?? '';
  const x = Math.round(object.x ?? 0);
  const y = Math.round(object.y ?? 0);
  return `${layerName}|${id}|${name}|${x}|${y}`;
}

function countCollidable(objects) {
  let trueCount = 0;
  let falseCount = 0;
  let missing = 0;
  for (const object of objects) {
    const props = object.properties ?? [];
    const col = props.find((property) => property.name === 'collidable');
    if (!col) missing += 1;
    else if (col.value === true) trueCount += 1;
    else falseCount += 1;
  }
  return { trueCount, falseCount, missing };
}

function layerPropsCollidable(layer) {
  const props = layer.properties ?? [];
  const col = props.find((property) => property.name === 'collidable');
  return col?.value;
}

console.log('=== AUDITORIA city_01_test.tmj vs city01PhaserMap.json ===\n');

const tmjTilesets = tmj.tilesets ?? [];
const phaserTilesets = phaser.tilesets ?? [];
console.log('--- TILESETS ---');
console.log(`TMJ count: ${tmjTilesets.length} | Phaser count: ${phaserTilesets.length}`);

const orderMismatch = [];
for (let index = 0; index < tmjTilesets.length; index += 1) {
  const tileset = tmjTilesets[index];
  const phaserIndex = phaserTilesets.findIndex(
    (entry) => entry.firstgid === tileset.firstgid && entry.name === tileset.name,
  );
  if (phaserIndex !== index) {
    orderMismatch.push({
      tmjIndex: index,
      phaserIndex,
      name: tileset.name,
      firstgid: tileset.firstgid,
    });
  }
}

const firstgidMismatch = [];
for (const tileset of tmjTilesets) {
  const match = phaserTilesets.find(
    (entry) => entry.name === tileset.name && entry.firstgid === tileset.firstgid,
  );
  if (!match) {
    const byName = phaserTilesets.find((entry) => entry.name === tileset.name);
    firstgidMismatch.push({
      name: tileset.name,
      tmjFirstgid: tileset.firstgid,
      phaserFirstgid: byName?.firstgid ?? 'MISSING',
    });
  }
}

const phaserIsSorted = phaserTilesets.every(
  (tileset, index) => index === 0 || tileset.firstgid >= phaserTilesets[index - 1].firstgid,
);
const tmjIsSorted = tmjTilesets.every(
  (tileset, index) => index === 0 || tileset.firstgid >= tmjTilesets[index - 1].firstgid,
);

console.log(`TMJ tilesets em ordem firstgid crescente? ${tmjIsSorted}`);
console.log(`Phaser tilesets em ordem firstgid crescente? ${phaserIsSorted}`);
console.log(`Phaser reordenou vs TMJ (índice diferente): ${orderMismatch.length} tileset(s)`);
if (orderMismatch.length > 0) {
  orderMismatch.slice(0, 8).forEach((entry) => console.log('  ', JSON.stringify(entry)));
  if (orderMismatch.length > 8) console.log(`  ... +${orderMismatch.length - 8} mais`);
}
console.log(`firstgid/name mismatch: ${firstgidMismatch.length}`);
firstgidMismatch.forEach((entry) => console.log('  ', JSON.stringify(entry)));

const nameCounts = {};
for (const tileset of tmjTilesets) {
  nameCounts[tileset.name] = (nameCounts[tileset.name] ?? 0) + 1;
}
const dupNames = Object.entries(nameCounts).filter(([, count]) => count > 1);
console.log(
  'Nomes duplicados no TMJ:',
  dupNames.map(([name, count]) => `${name} x${count}`).join(', ') || 'nenhum',
);

const tmjObjLayers = getObjectLayers(tmj);
const phaserObjLayers = getObjectLayers(phaser);

console.log('\n--- OBJECT LAYERS ---');
console.log(`TMJ object groups: ${tmjObjLayers.length} | Phaser: ${phaserObjLayers.length}`);

let totalTmjObjs = 0;
let totalPhaserObjs = 0;
let totalTmjColTrue = 0;
let totalPhaserColTrue = 0;

const layerReport = [];
const missingInPhaser = [];
const extraInPhaser = [];
const gidMismatches = [];
const propertyMismatches = [];

for (const tmjLayer of tmjObjLayers) {
  const phaserLayer = phaserObjLayers.find((layer) => layer.name === tmjLayer.name);
  const tmjObjects = tmjLayer.objects ?? [];
  const phaserObjects = phaserLayer?.objects ?? [];
  totalTmjObjs += tmjObjects.length;
  totalPhaserObjs += phaserObjects.length;

  const tmjCol = countCollidable(tmjObjects);
  const phaserCol = countCollidable(phaserObjects);
  totalTmjColTrue += tmjCol.trueCount;
  totalPhaserColTrue += phaserCol.trueCount;

  layerReport.push({
    name: tmjLayer.name,
    tmjCount: tmjObjects.length,
    phaserCount: phaserObjects.length,
    tmjCollidableTrue: tmjCol.trueCount,
    phaserCollidableTrue: phaserCol.trueCount,
    layerCollidableProp: layerPropsCollidable(tmjLayer),
    match:
      tmjObjects.length === phaserObjects.length
      && tmjCol.trueCount === phaserCol.trueCount,
  });

  if (!phaserLayer) {
    for (const object of tmjObjects) {
      missingInPhaser.push({ layer: tmjLayer.name, reason: 'layer missing', object });
    }
    continue;
  }

  const phaserByKey = new Map(phaserObjects.map((object) => [objKey(object, tmjLayer.name), object]));
  const tmjKeys = new Set();

  for (const tmjObject of tmjObjects) {
    const key = objKey(tmjObject, tmjLayer.name);
    tmjKeys.add(key);
    const phaserObject = phaserByKey.get(key) ?? phaserObjects.find((object) => object.id === tmjObject.id);

    if (!phaserObject) {
      missingInPhaser.push({
        layer: tmjLayer.name,
        id: tmjObject.id,
        name: tmjObject.name,
        x: tmjObject.x,
        y: tmjObject.y,
        gid: tmjObject.gid,
      });
      continue;
    }

    if (typeof tmjObject.gid === 'number') {
      const decoded = decodeGid(tmjObject.gid);
      const expectedPhaserGid = decoded.real;
      if (phaserObject.gid !== expectedPhaserGid) {
        gidMismatches.push({
          layer: tmjLayer.name,
          id: tmjObject.id,
          name: tmjObject.name,
          tmjRawGid: decoded.raw,
          tmjRealGid: decoded.real,
          tmjFlags: { h: decoded.flipH, v: decoded.flipV, d: decoded.flipD },
          phaserGid: phaserObject.gid,
          expected: expectedPhaserGid,
        });
      }
    } else if (typeof phaserObject.gid === 'number') {
      gidMismatches.push({
        layer: tmjLayer.name,
        id: tmjObject.id,
        name: tmjObject.name,
        issue: 'tmj sem gid, phaser tem',
        phaserGid: phaserObject.gid,
      });
    }

    const tmjProps = JSON.stringify(
      [...(tmjObject.properties ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    );
    const phaserProps = JSON.stringify(
      [...(phaserObject.properties ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    );
    if (tmjProps !== phaserProps) {
      propertyMismatches.push({
        layer: tmjLayer.name,
        id: tmjObject.id,
        name: tmjObject.name,
        tmjProps: tmjObject.properties,
        phaserProps: phaserObject.properties,
      });
    }

    for (const field of ['x', 'y', 'width', 'height', 'rotation', 'visible', 'type']) {
      if (tmjObject[field] === undefined || !phaserObject) continue;
      if (tmjObject[field] === phaserObject[field]) continue;
      if ((field === 'x' || field === 'y') && Math.abs(tmjObject[field] - phaserObject[field]) <= 0.01) {
        continue;
      }
      propertyMismatches.push({
        layer: tmjLayer.name,
        id: tmjObject.id,
        field,
        tmj: tmjObject[field],
        phaser: phaserObject[field],
      });
    }
  }

  for (const phaserObject of phaserObjects) {
    const key = objKey(phaserObject, tmjLayer.name);
    if (!tmjKeys.has(key) && !tmjObjects.some((object) => object.id === phaserObject.id)) {
      extraInPhaser.push({
        layer: tmjLayer.name,
        id: phaserObject.id,
        name: phaserObject.name,
      });
    }
  }
}

console.log('\nPor camada:');
for (const report of layerReport) {
  const status = report.match ? 'OK' : 'MISMATCH';
  const layerNote = report.layerCollidableProp !== undefined
    ? ` (layer collidable=${report.layerCollidableProp})`
    : '';
  console.log(
    ` [${status}] ${report.name}: objs ${report.tmjCount}/${report.phaserCount}, collidable:true ${report.tmjCollidableTrue}/${report.phaserCollidableTrue}${layerNote}`,
  );
}

console.log(`\nTotais objetos: TMJ ${totalTmjObjs} | Phaser ${totalPhaserObjs} | match: ${totalTmjObjs === totalPhaserObjs}`);
console.log(
  `Totais collidable:true: TMJ ${totalTmjColTrue} | Phaser ${totalPhaserColTrue} | match: ${totalTmjColTrue === totalPhaserColTrue}`,
);

const flipObjects = [];
for (const layer of tmjObjLayers) {
  for (const object of layer.objects ?? []) {
    if (typeof object.gid !== 'number') continue;
    const decoded = decodeGid(object.gid);
    if (decoded.hadFlags) {
      flipObjects.push({
        layer: layer.name,
        id: object.id,
        raw: decoded.raw,
        real: decoded.real,
        flipH: decoded.flipH,
        flipV: decoded.flipV,
        flipD: decoded.flipD,
      });
    }
  }
}

console.log('\n--- GIDs com flags de flip no TMJ (object layers) ---');
console.log(`Total: ${flipObjects.length}`);
flipObjects.slice(0, 20).forEach((entry) => {
  console.log(
    `  ${entry.layer} id=${entry.id} raw=${entry.raw} real=${entry.real} H=${entry.flipH} V=${entry.flipV} D=${entry.flipD}`,
  );
});
if (flipObjects.length > 20) console.log(` ... +${flipObjects.length - 20} mais`);

console.log('\n--- GID mismatches (esperado: phaser gid = realGid sem flags) ---');
console.log(`Count: ${gidMismatches.length}`);
gidMismatches.forEach((entry) => console.log('  ', JSON.stringify(entry)));

console.log('\n--- Property/field mismatches ---');
console.log(`Count: ${propertyMismatches.length}`);
propertyMismatches.slice(0, 25).forEach((entry) => console.log('  ', JSON.stringify(entry)));

console.log('\n--- Objetos no TMJ ausentes no Phaser espelho ---');
console.log(`Count: ${missingInPhaser.length}`);
missingInPhaser.forEach((entry) => console.log('  ', JSON.stringify(entry)));

console.log('\n--- Objetos extras só no Phaser ---');
console.log(`Count: ${extraInPhaser.length}`);
extraInPhaser.forEach((entry) => console.log('  ', JSON.stringify(entry)));

const tmjTileLayers = (tmj.layers ?? []).filter((layer) => layer.type === 'tilelayer');
const phaserTileLayers = (phaser.layers ?? []).filter((layer) => layer.type === 'tilelayer');
console.log('\n--- TILE LAYERS (alterações esperadas: strip non-grid GIDs) ---');
console.log(`Tile layers TMJ: ${tmjTileLayers.length} Phaser: ${phaserTileLayers.length}`);
let tileGidChanges = 0;
for (const tmjTileLayer of tmjTileLayers) {
  const phaserTileLayer = phaserTileLayers.find((layer) => layer.name === tmjTileLayer.name);
  if (!phaserTileLayer) {
    console.log(` MISSING layer: ${tmjTileLayer.name}`);
    continue;
  }
  const tmjData = tmjTileLayer.data ?? [];
  const phaserData = phaserTileLayer.data ?? [];
  let changes = 0;
  for (let index = 0; index < Math.min(tmjData.length, phaserData.length); index += 1) {
    if (tmjData[index] !== phaserData[index]) changes += 1;
  }
  if (changes > 0) {
    console.log(`  ${tmjTileLayer.name}: ${changes} células alteradas (de ${tmjData.length})`);
  }
  tileGidChanges += changes;
}
console.log(`Total células tilelayer alteradas: ${tileGidChanges}`);

const objectsOk =
  totalTmjObjs === totalPhaserObjs
  && totalTmjColTrue === totalPhaserColTrue
  && gidMismatches.length === 0
  && missingInPhaser.length === 0
  && propertyMismatches.length === 0
  && firstgidMismatch.length === 0;

console.log(`\n=== RESULTADO OBJETOS/PROPS/GIDS: ${objectsOk ? 'PASS' : 'ISSUES'} ===`);
if (orderMismatch.length > 0) {
  console.log(
    'NOTA: buildPhaserTiledMapData ordena tilesets por firstgid — índice no array pode diferir do TMJ; firstgid em si deve bater.',
  );
}
