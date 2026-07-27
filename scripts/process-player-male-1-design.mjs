#!/usr/bin/env node
/**
 * Processa arte oficial player_male_1 (pasta Player/) → canvas 35×54 + metadata.
 * Fonte: public/assets/player/player_male_1/Player/
 * Saída: design/rotations + design/animations + metadata.json
 */
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundleRoot = path.join(root, 'public', 'assets', 'player', 'player_male_1');
const sourceRoot = path.join(bundleRoot, 'Player');
const designRoot = path.join(bundleRoot, 'design');

const TARGET_W = 35;
const TARGET_H = 54;
/** Margem 1px — evita cabelo/sapatos colados na borda do canvas (fonte 29×55). */
const PAD_X = 1;
const PAD_Y = 1;

function fail(msg) {
  console.error(`[process-player-male-1] FAIL — ${msg}`);
  process.exit(1);
}

function listPngs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Encaixa o frame no canvas 35×54 — âncora nos pés (bottom-center) com pad. */
async function toDesignCanvas(inputPath, { flipX = false } = {}) {
  let pipeline = sharp(inputPath).ensureAlpha();
  const meta = await pipeline.metadata();
  const srcW = meta.width ?? TARGET_W;
  const srcH = meta.height ?? TARGET_H;

  const availW = TARGET_W - PAD_X * 2;
  const availH = TARGET_H - PAD_Y * 2;
  const scale = Math.min(1, availW / srcW, availH / srcH);
  const drawW = Math.max(1, Math.round(srcW * scale));
  const drawH = Math.max(1, Math.round(srcH * scale));

  let resized = await sharp(inputPath)
    .ensureAlpha()
    .resize(drawW, drawH, { fit: 'fill', kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();

  if (flipX) {
    resized = await sharp(resized).flop().png().toBuffer();
  }

  const left = Math.floor((TARGET_W - drawW) / 2);
  const top = TARGET_H - PAD_Y - drawH;

  return sharp({
    create: {
      width: TARGET_W,
      height: TARGET_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

async function writeFrames(files, sourceDir, outDir, { flipX = false } = {}) {
  mkdirSync(outDir, { recursive: true });
  const outNames = [];
  for (let i = 0; i < files.length; i += 1) {
    const name = `${String(i + 1).padStart(2, '0')}.png`;
    const buf = await toDesignCanvas(path.join(sourceDir, files[i]), { flipX });
    writeFileSync(path.join(outDir, name), buf);
    outNames.push(name);
  }
  return outNames;
}

if (!existsSync(sourceRoot)) {
  fail(`fonte ausente: ${sourceRoot}`);
}

const idleDir = path.join(sourceRoot, 'Idle');
const frontDir = path.join(sourceRoot, 'walk front');
const backDir = path.join(sourceRoot, 'walk back');
const sideDir = path.join(sourceRoot, 'walk side');

const idleFiles = listPngs(idleDir);
const frontFiles = listPngs(frontDir);
const backFiles = listPngs(backDir);
const sideFiles = listPngs(sideDir);

if (idleFiles.length === 0 || frontFiles.length === 0 || backFiles.length === 0 || sideFiles.length === 0) {
  fail('faltam frames Idle / walk front / walk back / walk side');
}

const animIdle = path.join(designRoot, 'animations', 'idle_south');
const animWalkS = path.join(designRoot, 'animations', 'walk_south');
const animWalkN = path.join(designRoot, 'animations', 'walk_north');
const animWalkE = path.join(designRoot, 'animations', 'walk_east');
const animWalkW = path.join(designRoot, 'animations', 'walk_west');
const rotationsDir = path.join(designRoot, 'rotations');

mkdirSync(rotationsDir, { recursive: true });

const idleNames = await writeFrames(idleFiles, idleDir, animIdle);
const walkSNames = await writeFrames(frontFiles, frontDir, animWalkS);
const walkNNames = await writeFrames(backFiles, backDir, animWalkN);
const walkENames = await writeFrames(sideFiles, sideDir, animWalkE);
const walkWNames = await writeFrames(sideFiles, sideDir, animWalkW, { flipX: true });

// Rotations estáticas = primeiro frame de cada direção (preview / fallback).
const staticMap = {
  south: path.join(animIdle, idleNames[0]),
  north: path.join(animWalkN, walkNNames[0]),
  east: path.join(animWalkE, walkENames[0]),
  west: path.join(animWalkW, walkWNames[0]),
};

for (const [dir, src] of Object.entries(staticMap)) {
  writeFileSync(path.join(rotationsDir, `${dir}.png`), await sharp(src).png().toBuffer());
}

// Preview UI 96×96 — char create/select (frame 35×54 some no picker escuro).
const previewDir = path.join(designRoot, 'preview');
mkdirSync(previewDir, { recursive: true });
const previewSouth = await sharp(path.join(rotationsDir, 'south.png'))
  .ensureAlpha()
  .resize(96, 96, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    kernel: sharp.kernel.nearest,
  })
  .png()
  .toBuffer();
writeFileSync(path.join(previewDir, 'south.png'), previewSouth);

// Diagonais → cardinal mais próximo (arte ainda sem 8-way).
const diagonalAlias = {
  'south-east': 'south',
  'south-west': 'south',
  'north-east': 'north',
  'north-west': 'north',
};
for (const [diag, base] of Object.entries(diagonalAlias)) {
  writeFileSync(
    path.join(rotationsDir, `${diag}.png`),
    await sharp(path.join(rotationsDir, `${base}.png`)).png().toBuffer(),
  );
}

const rel = (subdir, name) => `design/${subdir}/${name}`.replace(/\\/g, '/');

const metadata = {
  group_id: null,
  states: [
    {
      character: {
        id: 'player_male_1_design',
        name: 'player_male_1 — design oficial',
        size: { width: TARGET_W, height: TARGET_H },
        directions: 4,
        view: 'top-down',
        source: 'Player/ (game design)',
      },
      folder: 'design',
      frames: {
        rotations: {
          south: 'design/rotations/south.png',
          'south-east': 'design/rotations/south-east.png',
          east: 'design/rotations/east.png',
          'north-east': 'design/rotations/north-east.png',
          north: 'design/rotations/north.png',
          'north-west': 'design/rotations/north-west.png',
          west: 'design/rotations/west.png',
          'south-west': 'design/rotations/south-west.png',
        },
        animations: {
          idle: {
            south: idleNames.map((n) => rel('animations/idle_south', n)),
          },
          walk: {
            south: walkSNames.map((n) => rel('animations/walk_south', n)),
            north: walkNNames.map((n) => rel('animations/walk_north', n)),
            east: walkENames.map((n) => rel('animations/walk_east', n)),
            west: walkWNames.map((n) => rel('animations/walk_west', n)),
          },
        },
      },
    },
  ],
  export_version: '3.1-design',
  export_date: new Date().toISOString(),
};

writeFileSync(path.join(bundleRoot, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);

console.log('[process-player-male-1] OK');
console.log(`  canvas     → ${TARGET_W}×${TARGET_H}`);
console.log(`  idle       → ${idleNames.length} frames`);
console.log(`  walk south → ${walkSNames.length}`);
console.log(`  walk north → ${walkNNames.length}`);
console.log(`  walk east  → ${walkENames.length}`);
console.log(`  walk west  → ${walkWNames.length} (flip)`);
console.log(`  metadata   → ${path.join(bundleRoot, 'metadata.json')}`);
