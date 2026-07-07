/**
 * Gera atlases Phaser (JSON + PNG) em public/assets/processed/.
 *
 * Build offline — sharp só lê arquivos do repo; nenhuma entrada de jogador/rede.
 *
 * Modos:
 * - grid-tileset: fatia grade 32×32, alinha largura/altura ao múltiplo do tile (fix CraftPix 240px)
 * - sprite-glob: empacota PNGs soltos (ex. rotações zone1) em atlas JSONArray
 *
 * Uso: npm run generate-assets
 */
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildPhaserAtlasJson } from './lib/atlas/phaserAtlasJson.js';
import { discoverMapGridTilesetJobs } from './lib/discoverMapTilesetJobs.js';
import { packRectsShelf } from './lib/atlas/shelfPacker.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const processedDir = path.join(publicDir, 'assets', 'processed');
const tilesetsOutDir = path.join(processedDir, 'tilesets');
const creaturesOutDir = path.join(processedDir, 'creatures');

type GridTilesetJob = {
  readonly kind: 'grid-tileset';
  readonly id: string;
  readonly sourceRelative: string;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly columns: number;
  readonly tilecount: number;
};

type SpriteGlobJob = {
  readonly kind: 'sprite-glob';
  readonly id: string;
  readonly sourceRelativeDir: string;
  readonly globSuffix: string;
  readonly maxAtlasWidth: number;
  readonly padding: number;
};

type AtlasJob = GridTilesetJob | SpriteGlobJob;

const STATIC_SPRITE_JOBS: readonly SpriteGlobJob[] = [
  {
    kind: 'sprite-glob',
    id: 'zone1_top_down_creatures',
    sourceRelativeDir: 'assets/creatures/zone1_top_down_mundo',
    globSuffix: '/rotations/',
    maxAtlasWidth: 2048,
    padding: 2,
  },
];

type ManifestTileset = {
  readonly imageUrl: string;
  readonly atlasUrl: string;
  readonly tileWidth: number;
  readonly tileHeight: number;
  /** Colunas declaradas no Tiled (.tsx) — não confundir com alignedWidth / tileWidth. */
  readonly columns: number;
  readonly tilecount: number;
  readonly alignedWidth: number;
  readonly alignedHeight: number;
  readonly sourceUrl: string;
};

type ManifestSpriteAtlas = {
  readonly imageUrl: string;
  readonly atlasUrl: string;
  readonly frameCount: number;
};

function toPublicUrl(relativeFromPublic: string): string {
  return `/${relativeFromPublic.replace(/\\/g, '/')}`;
}

function walkPngFiles(dir: string, suffixFilter?: string): string[] {
  const out: string[] = [];
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkPngFiles(full, suffixFilter));
      continue;
    }
    if (!entry.name.toLowerCase().endsWith('.png')) continue;
    if (suffixFilter && !full.replace(/\\/g, '/').includes(suffixFilter)) continue;
    out.push(full);
  }

  return out.sort();
}

async function processGridTileset(job: GridTilesetJob): Promise<ManifestTileset> {
  const sourceFs = path.join(publicDir, job.sourceRelative);
  const meta = await sharp(sourceFs).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (width <= 0 || height <= 0) {
    throw new Error(`[generateAtlas] Imagem inválida: ${sourceFs}`);
  }

  const alignedWidth = Math.ceil(width / job.tileWidth) * job.tileWidth;
  const alignedHeight = Math.ceil(height / job.tileHeight) * job.tileHeight;

  const imageName = `${job.id}.png`;
  const jsonName = `${job.id}.json`;
  const imageFs = path.join(tilesetsOutDir, imageName);
  const jsonFs = path.join(tilesetsOutDir, jsonName);

  await sharp(sourceFs)
    .ensureAlpha()
    .extend({
      top: 0,
      left: 0,
      right: alignedWidth - width,
      bottom: alignedHeight - height,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(imageFs);

  const tiledColumns = Math.max(1, job.columns);
  const tilecount = Math.min(job.tilecount, tiledColumns * Math.max(1, Math.floor(alignedHeight / job.tileHeight)));

  const frames: Array<{
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  for (let index = 0; index < tilecount; index += 1) {
    const col = index % tiledColumns;
    const row = Math.floor(index / tiledColumns);
    frames.push({
      name: String(index),
      x: col * job.tileWidth,
      y: row * job.tileHeight,
      width: job.tileWidth,
      height: job.tileHeight,
    });
  }

  const atlas = buildPhaserAtlasJson(imageName, alignedWidth, alignedHeight, frames);
  writeFileSync(jsonFs, `${JSON.stringify(atlas, null, 2)}\n`, 'utf8');

  const sourceUrl = toPublicUrl(job.sourceRelative);
  const imageUrl = toPublicUrl(path.join('assets/processed/tilesets', imageName).replace(/\\/g, '/'));
  const atlasUrl = toPublicUrl(path.join('assets/processed/tilesets', jsonName).replace(/\\/g, '/'));

  console.log(
    `[generateAtlas] grid-tileset ${job.id}: ${width}×${height} → ${alignedWidth}×${alignedHeight} (${tilecount} tiles, tiledCols=${tiledColumns})`,
  );

  return {
    sourceUrl,
    imageUrl,
    atlasUrl,
    tileWidth: job.tileWidth,
    tileHeight: job.tileHeight,
    columns: tiledColumns,
    tilecount,
    alignedWidth,
    alignedHeight,
  };
}

async function processSpriteGlob(job: SpriteGlobJob): Promise<ManifestSpriteAtlas> {
  const sourceDir = path.join(publicDir, job.sourceRelativeDir);
  const pngFiles = walkPngFiles(sourceDir, job.globSuffix);

  if (pngFiles.length === 0) {
    throw new Error(`[generateAtlas] Nenhum PNG em ${sourceDir} (${job.globSuffix})`);
  }

  type SpriteInput = {
    readonly id: string;
    readonly fsPath: string;
    readonly width: number;
    readonly height: number;
    readonly buffer: Buffer;
  };

  const sprites: SpriteInput[] = [];

  for (const fsPath of pngFiles) {
    const relative = path.relative(sourceDir, fsPath).replace(/\\/g, '/').replace(/\.png$/i, '');
    const image = sharp(fsPath).ensureAlpha();
    const meta = await image.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    const buffer = await image.png().toBuffer();

    sprites.push({
      id: relative.replace(/\//g, '__'),
      fsPath,
      width,
      height,
      buffer,
    });
  }

  const pack = packRectsShelf(
    sprites.map((s) => ({ id: s.id, width: s.width, height: s.height })),
    job.maxAtlasWidth,
    job.padding,
  );

  const composites: sharp.OverlayOptions[] = [];
  const atlasFrames: Array<{
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
  }> = [];

  for (const rect of pack.packed) {
    const sprite = sprites.find((s) => s.id === rect.id);
    if (!sprite) continue;

    composites.push({
      input: sprite.buffer,
      left: rect.x,
      top: rect.y,
    });

    atlasFrames.push({
      name: rect.id,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      sourceWidth: sprite.width,
      sourceHeight: sprite.height,
    });
  }

  const imageName = `${job.id}.png`;
  const jsonName = `${job.id}.json`;
  const imageFs = path.join(creaturesOutDir, imageName);
  const jsonFs = path.join(creaturesOutDir, jsonName);

  await sharp({
    create: {
      width: pack.width,
      height: pack.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(imageFs);

  const atlas = buildPhaserAtlasJson(imageName, pack.width, pack.height, atlasFrames);
  writeFileSync(jsonFs, `${JSON.stringify(atlas, null, 2)}\n`, 'utf8');

  const imageUrl = toPublicUrl(path.join('assets/processed/creatures', imageName).replace(/\\/g, '/'));
  const atlasUrl = toPublicUrl(path.join('assets/processed/creatures', jsonName).replace(/\\/g, '/'));

  console.log(
    `[generateAtlas] sprite-glob ${job.id}: ${sprites.length} frames → ${pack.width}×${pack.height}`,
  );

  return {
    imageUrl,
    atlasUrl,
    frameCount: atlasFrames.length,
  };
}

async function main(): Promise<void> {
  mkdirSync(tilesetsOutDir, { recursive: true });
  mkdirSync(creaturesOutDir, { recursive: true });

  const discovered = discoverMapGridTilesetJobs(publicDir);
  console.log(
    `[generateAtlas] ${discovered.length} tileset(s) 32×32 desalinhado(s) referenciados em map_mund`,
  );
  for (const job of discovered) {
    console.log(`  - ${job.sourceRelative} ← mapas [${job.mapIds.join(', ')}]`);
  }

  const tilesets: ManifestTileset[] = [];
  const spriteAtlases: ManifestSpriteAtlas[] = [];

  for (const discoveredJob of discovered) {
    tilesets.push(
      await processGridTileset({
        kind: 'grid-tileset',
        ...discoveredJob,
      }),
    );
  }

  for (const job of STATIC_SPRITE_JOBS) {
    spriteAtlases.push(await processSpriteGlob(job));
  }

  writeProcessedManifest(tilesets, spriteAtlases);
  console.log('[generateAtlas] Concluído.');
}

function writeProcessedManifest(
  tilesets: readonly ManifestTileset[],
  spriteAtlases: readonly ManifestSpriteAtlas[],
): void {
  const tilesetMap: Record<string, ManifestTileset> = {};
  for (const entry of tilesets) {
    tilesetMap[entry.sourceUrl] = entry;
  }

  const manifestPath = path.join(processedDir, 'manifest.json');
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ tilesets: tilesetMap, spriteAtlases }, null, 2)}\n`,
    'utf8',
  );

  const tsSource = `/**
 * Manifest gerado por \`npm run generate-assets\` (scripts/generateAtlas.ts).
 * NÃO editar manualmente — rode o script após alterar PNGs de origem.
 */
export type ProcessedTilesetEntry = {
  readonly imageUrl: string;
  readonly atlasUrl: string;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly columns: number;
  readonly tilecount: number;
  readonly alignedWidth: number;
  readonly alignedHeight: number;
  readonly sourceUrl: string;
};

export type ProcessedSpriteAtlasEntry = {
  readonly imageUrl: string;
  readonly atlasUrl: string;
  readonly frameCount: number;
};

export const PROCESSED_TILESET_BY_SOURCE_URL: Readonly<Record<string, ProcessedTilesetEntry>> = ${JSON.stringify(tilesetMap, null, 2)} as const;

export const PROCESSED_SPRITE_ATLASES: readonly ProcessedSpriteAtlasEntry[] = ${JSON.stringify(spriteAtlases, null, 2)} as const;

export function resolveProcessedTilesetAsset(
  sourcePublicUrl: string,
): ProcessedTilesetEntry | null {
  return PROCESSED_TILESET_BY_SOURCE_URL[sourcePublicUrl] ?? null;
}
`;

  const manifestTs = path.join(root, 'src', 'config', 'processedAssetManifest.ts');
  writeFileSync(manifestTs, tsSource, 'utf8');

  console.log(`[generateAtlas] manifest → ${path.relative(root, manifestPath)}`);
  console.log(`[generateAtlas] manifest TS → ${path.relative(root, manifestTs)}`);
}

main().catch((error) => {
  console.error('[generateAtlas] Falha:', error);
  process.exitCode = 1;
});
