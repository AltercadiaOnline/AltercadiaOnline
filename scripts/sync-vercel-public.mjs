#!/usr/bin/env node
/**
 * Pós-build Vercel — espelha artefatos compilados e vendors em public/
 * para servir como estáticos (evita 404 em /client/*, /shared/*, /vendor/*).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const publicDir = path.join(root, 'public');

function copyDir(from, to) {
  if (!existsSync(from)) {
    console.error(`[sync-vercel-public] Origem ausente: ${from}`);
    process.exit(1);
  }
  rmSync(to, { recursive: true, force: true });
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`[sync-vercel-public] ${path.relative(root, from)} → ${path.relative(root, to)}`);
}

const clientSrc = path.join(distDir, 'client');
const sharedSrc = path.join(distDir, 'shared');
const gsapSrc = path.join(root, 'node_modules', 'gsap');

copyDir(clientSrc, path.join(publicDir, 'client'));
copyDir(sharedSrc, path.join(publicDir, 'shared'));

const configSrc = path.join(distDir, 'config');
if (existsSync(configSrc)) {
  copyDir(configSrc, path.join(publicDir, 'config'));
} else {
  console.error('[sync-vercel-public] dist/config ausente — verifique imports do cliente');
  process.exit(1);
}

if (existsSync(gsapSrc)) {
  copyDir(gsapSrc, path.join(publicDir, 'vendor', 'gsap'));
} else {
  console.warn('[sync-vercel-public] gsap não encontrado — rode npm ci');
}

const mainBundle = path.join(publicDir, 'client', 'browser', 'main.js');
const designConstantsBundle = path.join(publicDir, 'config', 'designConstants.js');
if (!existsSync(mainBundle)) {
  console.error('[sync-vercel-public] main.js ausente após sync — verifique npm run build');
  process.exit(1);
}
if (!existsSync(designConstantsBundle)) {
  console.error('[sync-vercel-public] config/designConstants.js ausente — login na Vercel quebrará');
  process.exit(1);
}

console.log('[sync-vercel-public] OK');
