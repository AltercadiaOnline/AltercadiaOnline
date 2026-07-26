#!/usr/bin/env node
/**
 * Guard de peso do bundle estático (deploy/clone leves).
 *
 * `public/` vai para a Vercel via Git. Arquivos de AUTORIA (PSD, AI, ZIP…)
 * não são consumidos em runtime — o browser usa só .png/.js/.css/.json.
 *
 * - FALHA se algum arquivo proibido estiver **rastreado pelo Git**
 *   (mesmo com force-add / .gitignore furado).
 * - AVISA se existir no disco mas ignorado (não vai no deploy Git;
 *   limpe localmente se o Docker/COPY local estiver inchando).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');

/** Formatos de autoria/arquivo que nunca devem ir para produção. */
const FORBIDDEN_EXTENSIONS = new Set([
  '.psd', '.psb', '.ai', '.xcf', '.fig', '.sketch',
  '.tiff', '.tif', '.zip', '.rar', '.7z', '.pdf', '.tiled-session',
]);

/** PNG/JPG acima disto quase sempre é export não otimizado — alerta (não falha). */
const LARGE_IMAGE_WARN_BYTES = 2 * 1024 * 1024;
const LARGE_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function listTrackedPublicFiles() {
  try {
    const out = execFileSync(
      'git',
      ['-C', root, 'ls-files', '-z', '--', 'public'],
      { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 },
    );
    return out
      .toString('utf8')
      .split('\0')
      .filter(Boolean)
      .map((rel) => rel.replace(/\\/g, '/'));
  } catch {
    return null;
  }
}

function walkDisk(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__MACOSX') continue;
      walkDisk(abs, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    acc.push(path.relative(publicDir, abs).split(path.sep).join('/'));
  }
}

const tracked = listTrackedPublicFiles();
const diskRels = [];
walkDisk(publicDir, diskRels);

const trackedForbidden = [];
const diskOnlyForbidden = [];
const largeImages = [];

const trackedSet = tracked ? new Set(tracked) : null;

for (const rel of diskRels) {
  const ext = path.extname(rel).toLowerCase();
  const publicRel = `public/${rel}`;

  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    if (trackedSet?.has(publicRel)) {
      trackedForbidden.push(rel);
    } else {
      diskOnlyForbidden.push(rel);
    }
    continue;
  }

  if (LARGE_IMAGE_EXTENSIONS.has(ext)) {
    try {
      const size = statSync(path.join(publicDir, rel)).size;
      if (size > LARGE_IMAGE_WARN_BYTES) {
        largeImages.push(`${rel} (${(size / (1024 * 1024)).toFixed(1)} MB)`);
      }
    } catch {
      /* ignore */
    }
  }
}

// Também pega rastreados que sumiram do disco (raro) mas ainda no índice.
if (tracked) {
  for (const publicRel of tracked) {
    if (!publicRel.startsWith('public/')) continue;
    const rel = publicRel.slice('public/'.length);
    const ext = path.extname(rel).toLowerCase();
    if (FORBIDDEN_EXTENSIONS.has(ext) && !trackedForbidden.includes(rel)) {
      trackedForbidden.push(rel);
    }
  }
}

if (largeImages.length > 0) {
  console.warn('[audit-public-assets] Imagens grandes (considere otimizar):');
  for (const entry of largeImages) console.warn(`  ! ${entry}`);
}

if (diskOnlyForbidden.length > 0) {
  console.warn(
    `[audit-public-assets] ${diskOnlyForbidden.length} arquivo(s) de autoria só no disco (já ignorados pelo Git — não vão no deploy Vercel):`,
  );
  const preview = diskOnlyForbidden.slice(0, 12);
  for (const entry of preview) console.warn(`  ~ ${entry}`);
  if (diskOnlyForbidden.length > preview.length) {
    console.warn(`  ~ … +${diskOnlyForbidden.length - preview.length} outros`);
  }
  console.warn('  Dica: mova para art-source/ ou delete localmente para Docker/clone mais leve.');
}

if (trackedForbidden.length > 0) {
  console.error('[audit-public-assets] Arquivos de autoria RASTREADOS pelo Git (bloqueiam deploy):');
  for (const entry of trackedForbidden) console.error(`  - ${entry}`);
  console.error(
    '\nRemova do índice: git rm --cached <arquivo>\n'
    + 'E garanta que a extensão esteja no .gitignore (public/**/*.<ext>).',
  );
  process.exit(1);
}

if (!tracked) {
  console.warn('[audit-public-assets] Git indisponível — só varreu o disco; nenhum ofensor rastreado verificado.');
}

console.log('[audit-public-assets] OK — nenhum arquivo de autoria rastreado em public/.');
