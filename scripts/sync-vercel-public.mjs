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

/** Mescla .js compilados e .json de src/assets — preserva imagens/placeholders já em public/assets. */
function mergeCompiledAssetsTree(fromJsDir, fromJsonDir, toDir) {
  if (!existsSync(fromJsDir)) {
    console.error(`[sync-vercel-public] Origem ausente: ${fromJsDir}`);
    process.exit(1);
  }

  mkdirSync(toDir, { recursive: true });

  function walkJs(relativeDir) {
    const absoluteFrom = path.join(fromJsDir, relativeDir);
    for (const entry of readdirSync(absoluteFrom, { withFileTypes: true })) {
      const childRelative = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      const fromPath = path.join(fromJsDir, childRelative);
      const toPath = path.join(toDir, childRelative);

      if (entry.isDirectory()) {
        walkJs(childRelative);
        continue;
      }

      if (!entry.name.endsWith('.js')) continue;

      mkdirSync(path.dirname(toPath), { recursive: true });
      cpSync(fromPath, toPath);
    }
  }

  walkJs('');
  console.log(`[sync-vercel-public] ${path.relative(root, fromJsDir)} → ${path.relative(root, toDir)} (merge .js)`);

  /** Remove .js órfãos em public/assets (ex.: módulo movido para /shared). */
  function pruneOrphanJs(relativeDir) {
    const absoluteTo = path.join(toDir, relativeDir);
    if (!existsSync(absoluteTo)) return;

    for (const entry of readdirSync(absoluteTo, { withFileTypes: true })) {
      const childRelative = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      const toPath = path.join(toDir, childRelative);
      const fromPath = path.join(fromJsDir, childRelative);

      if (entry.isDirectory()) {
        pruneOrphanJs(childRelative);
        continue;
      }

      if (!entry.name.endsWith('.js')) continue;
      if (existsSync(fromPath)) continue;

      rmSync(toPath, { force: true });
      console.log(`[sync-vercel-public] removido órfão ${path.relative(root, toPath)}`);
    }
  }

  pruneOrphanJs('');

  if (!existsSync(fromJsonDir)) return;

  function walkJson(relativeDir) {
    const absoluteFrom = path.join(fromJsonDir, relativeDir);
    for (const entry of readdirSync(absoluteFrom, { withFileTypes: true })) {
      const childRelative = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      const fromPath = path.join(fromJsonDir, childRelative);
      const toPath = path.join(toDir, childRelative);

      if (entry.isDirectory()) {
        walkJson(childRelative);
        continue;
      }

      if (!entry.name.endsWith('.json')) continue;

      mkdirSync(path.dirname(toPath), { recursive: true });
      cpSync(fromPath, toPath);
    }
  }

  walkJson('');
  console.log(`[sync-vercel-public] ${path.relative(root, fromJsonDir)} → ${path.relative(root, toDir)} (merge .json)`);
}

const clientSrc = path.join(distDir, 'client');
const sharedSrc = path.join(distDir, 'shared');
const configSrc = path.join(distDir, 'config');
const assetsSrc = path.join(distDir, 'assets');
const assetsJsonSrc = path.join(root, 'src', 'assets');
const gsapSrc = path.join(root, 'node_modules', 'gsap');

copyDir(clientSrc, path.join(publicDir, 'client'));
copyDir(sharedSrc, path.join(publicDir, 'shared'));
copyDir(configSrc, path.join(publicDir, 'config'));
mergeCompiledAssetsTree(assetsSrc, assetsJsonSrc, path.join(publicDir, 'assets'));

if (existsSync(gsapSrc)) {
  copyDir(gsapSrc, path.join(publicDir, 'vendor', 'gsap'));
} else {
  console.warn('[sync-vercel-public] gsap não encontrado — rode npm ci');
}

const requiredBundles = [
  path.join(publicDir, 'client', 'browser', 'main.js'),
  path.join(publicDir, 'config', 'designConstants.js'),
  path.join(publicDir, 'assets', 'urban', 'urbanAssetManifest.js'),
  path.join(publicDir, 'assets', 'creatures', 'zone1', 'aranha', 'manifest.json'),
  path.join(publicDir, 'assets', 'creatures', 'zone1', 'corvo', 'manifest.json'),
];

for (const bundlePath of requiredBundles) {
  if (!existsSync(bundlePath)) {
    console.error(`[sync-vercel-public] Bundle ausente: ${path.relative(root, bundlePath)}`);
    process.exit(1);
  }
}

console.log('[sync-vercel-public] OK');
