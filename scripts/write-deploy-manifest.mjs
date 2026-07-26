#!/usr/bin/env node
/**
 * Gera public/config/deploy-manifest.json — commit Git embutido no build.
 * Vercel + Railway servem /config/deploy-manifest.json para comparar deploys.
 *
 * Em Docker (Railway) muitas vezes não há `.git` — usa variáveis de CI/plataforma.
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
    return execSync(`git ${args}`, { encoding: 'utf8', cwd: root }).trim() || null;
  } catch {
    return null;
  }
}

function envCommit() {
  const candidates = [
    process.env.RAILWAY_GIT_COMMIT_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.GITHUB_SHA,
    process.env.SOURCE_COMMIT,
    process.env.COMMIT_SHA,
    process.env.CF_PAGES_COMMIT_SHA,
  ];
  for (const value of candidates) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (/^[0-9a-f]{7,40}$/i.test(trimmed)) return trimmed.toLowerCase();
  }
  return null;
}

function envBranch() {
  const candidates = [
    process.env.RAILWAY_GIT_BRANCH,
    process.env.VERCEL_GIT_COMMIT_REF,
    process.env.GITHUB_REF_NAME,
    process.env.SOURCE_BRANCH,
  ];
  for (const value of candidates) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

const fromGit = gitValue('rev-parse HEAD');
const fromEnv = envCommit();
const commit = fromGit || fromEnv;
const commitShort = commit ? commit.slice(0, 7) : null;
const branch = gitValue('rev-parse --abbrev-ref HEAD') || envBranch();

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
  source: fromGit ? 'git' : fromEnv ? 'env' : 'none',
});
