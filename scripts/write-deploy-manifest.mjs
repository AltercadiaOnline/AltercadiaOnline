#!/usr/bin/env node
/**
 * Gera public/config/deploy-manifest.json — commit Git embutido no build.
 * Vercel + Railway servem /config/deploy-manifest.json para comparar deploys.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'config');
const outFile = path.join(outDir, 'deploy-manifest.json');

function gitValue(args) {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8', cwd: root }).trim();
  } catch {
    return null;
  }
}

const commit = gitValue('rev-parse HEAD');
const commitShort = gitValue('rev-parse --short HEAD');
const branch = gitValue('rev-parse --abbrev-ref HEAD');

const payload = {
  commit,
  commitShort,
  branch,
  builtAt: new Date().toISOString(),
  service: 'altercadia-v2',
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log('[write-deploy-manifest] OK', {
  commitShort: commitShort ?? '(unknown)',
  branch: branch ?? '(unknown)',
});
