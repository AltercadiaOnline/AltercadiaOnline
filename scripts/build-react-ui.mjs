#!/usr/bin/env node
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'app-ui');
const chunksDir = path.join(outDir, 'chunks');
const entryCss = path.join(root, 'src', 'client', 'app', 'styles', 'ui.tailwind.css');
const outCss = path.join(outDir, 'ui-runtime.css');
const entryTsx = path.join(root, 'src', 'client', 'app', 'runtime', 'uiRuntime.tsx');

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

await build({
  absWorkingDir: root,
  entryPoints: {
    'ui-runtime': entryTsx,
  },
  outdir: outDir,
  entryNames: '[name]',
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
});

console.log('[build-react-ui] OK');
