#!/usr/bin/env node
/**
 * Smoke test local pós-build — garante que módulos críticos existem em public/
 * e que rotas com extensão não seriam candidatas ao fallback SPA (ver vercel.json).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const vercelConfigPath = path.join(root, 'vercel.json');

const REQUIRED_JS = [
  'client/browser/main.js',
  'game/constants/GameConfig.js',
  'game/assets/assetNormalizer.js',
  'game/assetAtlasImageLoader.js',
  'game/generated/city01TestPackWiring.js',
  'game/AssetRegistry.js',
  'app-ui/ui-runtime.js',
];

let failed = false;

for (const relative of REQUIRED_JS) {
  const absolute = path.join(publicDir, relative);
  if (!existsSync(absolute)) {
    console.error(`[verify:vercel-static] AUSENTE: public/${relative}`);
    failed = true;
    continue;
  }
  const head = readFileSync(absolute, 'utf8').slice(0, 40);
  if (head.trimStart().startsWith('<!DOCTYPE') || head.trimStart().startsWith('<html')) {
    console.error(`[verify:vercel-static] HTML em vez de JS: public/${relative}`);
    failed = true;
  }
}

const vercel = JSON.parse(readFileSync(vercelConfigPath, 'utf8'));
const spaRewrite = vercel.rewrites?.find((entry) => entry.destination === '/index.html');
if (!spaRewrite?.source?.includes('\\.[')) {
  console.error('[verify:vercel-static] vercel.json: rewrite SPA deve excluir paths com extensão (.js, .png, …)');
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(`[verify:vercel-static] OK — ${REQUIRED_JS.length} módulos em public/ + regra SPA segura`);
