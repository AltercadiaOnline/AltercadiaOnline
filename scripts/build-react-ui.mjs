#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'app-ui');
const entryCss = path.join(root, 'src', 'client', 'app', 'styles', 'ui.tailwind.css');
const outCss = path.join(outDir, 'ui-runtime.css');
const entryTsx = path.join(root, 'src', 'client', 'app', 'runtime', 'uiRuntime.tsx');

mkdirSync(outDir, { recursive: true });

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
});

console.log('[build-react-ui] OK');
