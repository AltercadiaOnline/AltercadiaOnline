#!/usr/bin/env node
/**
 * Pós-build Vercel — espelha artefatos compilados e vendors em public/
 * para servir como estáticos (evita 404 em /client/*, /shared/*, /config/*, /assets/*.js).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
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

/** Mescla apenas .js compilados — preserva imagens/placeholders já em public/assets. */
function mergeCompiledJsTree(fromDir, toDir) {
  if (!existsSync(fromDir)) {
    console.error(`[sync-vercel-public] Origem ausente: ${fromDir}`);
    process.exit(1);
  }

  mkdirSync(toDir, { recursive: true });

  function walk(relativeDir) {
    const absoluteFrom = path.join(fromDir, relativeDir);
    for (const entry of readdirSync(absoluteFrom, { withFileTypes: true })) {
      const childRelative = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      const fromPath = path.join(fromDir, childRelative);
      const toPath = path.join(toDir, childRelative);

      if (entry.isDirectory()) {
        walk(childRelative);
        continue;
      }

      if (!entry.name.endsWith('.js')) continue;

      mkdirSync(path.dirname(toPath), { recursive: true });
      cpSync(fromPath, toPath);
    }
  }

  walk('');
  console.log(`[sync-vercel-public] ${path.relative(root, fromDir)} → ${path.relative(root, toDir)} (merge .js)`);
}

const clientSrc = path.join(distDir, 'client');
const sharedSrc = path.join(distDir, 'shared');
const configSrc = path.join(distDir, 'config');
const assetsSrc = path.join(distDir, 'assets');
const gsapSrc = path.join(root, 'node_modules', 'gsap');

copyDir(clientSrc, path.join(publicDir, 'client'));
copyDir(sharedSrc, path.join(publicDir, 'shared'));
copyDir(configSrc, path.join(publicDir, 'config'));
mergeCompiledJsTree(assetsSrc, path.join(publicDir, 'assets'));

if (existsSync(gsapSrc)) {
  copyDir(gsapSrc, path.join(publicDir, 'vendor', 'gsap'));
} else {
  console.warn('[sync-vercel-public] gsap não encontrado — rode npm ci');
}

const requiredBundles = [
  path.join(publicDir, 'client', 'browser', 'main.js'),
  path.join(publicDir, 'config', 'designConstants.js'),
  path.join(publicDir, 'assets', 'urban', 'urbanAssetManifest.js'),
];

for (const bundlePath of requiredBundles) {
  if (!existsSync(bundlePath)) {
    console.error(`[sync-vercel-public] Bundle ausente: ${path.relative(root, bundlePath)}`);
    process.exit(1);
  }
}

console.log('[sync-vercel-public] OK');
