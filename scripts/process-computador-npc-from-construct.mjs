/**
 * Extrai o sprite 48×48 dos computadores do sheet Construct e gera bundles NPC.
 * Fonte Construct: shared-0-sheet1.webp @ (67,129) — mesmo PNG para arena/marketplace/zona1.
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sheetPath = path.join(root, 'construct', 'altercadia-world', 'images', 'shared-0-sheet1.webp');
const sheetFallback = path.join(root, 'public', 'construct-world', 'images', 'shared-0-sheet1.webp');
const propFallback = path.join(
  root,
  'public',
  'assets',
  'props',
  'Pixel_art_sprite_sheet_48x48',
  'Pixel_art_sprite_sheet_48x48_per_item',
  'rotations',
  'unknown.png',
);

const CROP = { left: 67, top: 129, width: 48, height: 48 };
const BUNDLE = 'computador_npc';
const NPC_IDS = ['computador_arena', 'computador_marketplace', 'computador_zona1'];

async function extractPng() {
  const source = existsSync(sheetPath)
    ? sheetPath
    : existsSync(sheetFallback)
      ? sheetFallback
      : null;

  if (source) {
    return sharp(source)
      .extract(CROP)
      .ensureAlpha()
      .png()
      .toBuffer();
  }

  if (existsSync(propFallback)) {
    console.warn('[process-computador] sheet Construct ausente — usando prop 48×48 de fallback');
    return sharp(propFallback).ensureAlpha().png().toBuffer();
  }

  throw new Error('Nenhuma fonte de sprite de computador encontrada');
}

async function main() {
  const png = await extractPng();
  const bundleRoot = path.join(root, 'public', 'assets', 'npcs', BUNDLE);
  const rotationsDir = path.join(bundleRoot, 'rotations');
  mkdirSync(rotationsDir, { recursive: true });

  const southPath = path.join(rotationsDir, 'south.png');
  writeFileSync(southPath, png);
  // Um único frame — replicar para cardinais (loader pede south; extras evitam miss).
  for (const dir of ['north', 'east', 'west']) {
    copyFileSync(southPath, path.join(rotationsDir, `${dir}.png`));
  }

  const metadata = {
    states: [
      {
        character: {
          id: 'computador_terminal',
          name: 'Computador (terminal)',
          size: { width: 48, height: 48 },
          directions: 1,
          view: 'top-down',
        },
        folder: '.',
        frames: {
          rotations: {
            south: 'rotations/south.png',
            north: 'rotations/north.png',
            east: 'rotations/east.png',
            west: 'rotations/west.png',
          },
          animations: {},
        },
      },
    ],
    export_version: '3.0',
    export_date: new Date().toISOString(),
    source: {
      constructSheet: 'images/shared-0-sheet1.webp',
      crop: CROP,
      sharedByNpcIds: NPC_IDS,
    },
  };

  writeFileSync(path.join(bundleRoot, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(`[process-computador] OK → ${bundleRoot}`);
  console.log(`  frame 48×48 | NPCs: ${NPC_IDS.join(', ')}`);
}

main().catch((err) => {
  console.error('[process-computador] FAIL', err);
  process.exit(1);
});
