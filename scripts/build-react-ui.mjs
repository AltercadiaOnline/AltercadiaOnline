#!/usr/bin/env node
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { build, context } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'app-ui');
const chunksDir = path.join(outDir, 'chunks');
const entryCss = path.join(root, 'src', 'client', 'app', 'styles', 'ui.tailwind.css');
const outCss = path.join(outDir, 'ui-runtime.css');
const entryTsx = path.join(root, 'src', 'client', 'app', 'runtime', 'uiRuntime.tsx');
const watch = process.argv.includes('--watch');

mkdirSync(outDir, { recursive: true });
// Chunks hasheados antigos quebram lazy import (HUD some; Construct segue).
rmSync(chunksDir, { recursive: true, force: true });
mkdirSync(chunksDir, { recursive: true });

/** Stub: React HUD nunca embute Mock — simulador só via /client (dist) em localhost. */
const mockStubPlugin = {
  name: 'stub-mock-economy',
  setup(buildApi) {
    buildApi.onResolve({ filter: /MockEconomyService(\.js)?$/ }, () => ({
      path: 'altercadia:mock-economy-stub',
      namespace: 'altercadia-stub',
    }));
    buildApi.onLoad({ filter: /.*/, namespace: 'altercadia-stub' }, () => ({
      contents: 'export class MockEconomyService { constructor() { throw new Error("MockEconomyService blocked in app-ui bundle"); } }\n',
      loader: 'js',
    }));
  },
};

if (process.platform === 'win32') {
  execSync(
    `npm exec -- @tailwindcss/cli -i "${entryCss}" -o "${outCss}" --minify`,
    { cwd: root, stdio: 'inherit' },
  );
} else {
  execSync(
    `npm exec -- @tailwindcss/cli -i "${entryCss}" -o "${outCss}" --minify`,
    { cwd: root, stdio: 'inherit' },
  );
}

const esbuildOptions = {
  absWorkingDir: root,
  entryPoints: {
    'ui-runtime': entryTsx,
  },
  outdir: outDir,
  entryNames: '[name]',
  // Sempre com hash: em watch, `chunks/[name]` colide (vários arquivos viram chunk.js)
  // e o browser quebra com "does not provide an export named 'fb'".
  chunkNames: 'chunks/[name]-[hash]',
  splitting: true,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'automatic',
  sourcemap: false,
  minify: true,
  logLevel: 'info',
  plugins: [mockStubPlugin],
};

if (watch) {
  const ctx = await context(esbuildOptions);
  await ctx.watch();
  console.log('[build-react-ui] watching React HUD…');
} else {
  await build(esbuildOptions);
  console.log('[build-react-ui] OK');
}
