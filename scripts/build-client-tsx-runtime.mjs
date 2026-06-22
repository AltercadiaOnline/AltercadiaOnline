#!/usr/bin/env node
/**
 * Compila módulos .tsx referenciados por main.js (tsc com jsx:preserve não emite estes arquivos).
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist', 'client', 'app', 'runtime');

mkdirSync(outDir, { recursive: true });

const tsxEntries = [
  path.join(root, 'src', 'client', 'app', 'runtime', 'mountHudRuntime.tsx'),
];

await build({
  absWorkingDir: root,
  entryPoints: tsxEntries,
  outdir: outDir,
  entryNames: '[name]',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'automatic',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
  external: [],
});

console.log('[build-client-tsx-runtime] OK');
