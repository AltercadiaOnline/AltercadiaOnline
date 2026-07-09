#!/usr/bin/env node
/**
 * Deploy Altercadia V2 → GitHub (main) → Vercel + Railway (auto via GitHub).
 *
 * Uso:
 *   npm run deploy
 *   npm run jpush
 *   npm run deploy -- "feat: nova mecanica"
 *   DEPLOY_MSG="fix: cors" npm run deploy
 *   npm run deploy -- --no-wait
 */
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const noWait = args.includes('--no-wait');
const messageArg = args.find((arg) => !arg.startsWith('--'));

const message =
  messageArg ??
  process.env.DEPLOY_MSG ??
  `deploy: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

function run(cmd, env = {}) {
  execSync(cmd, {
    stdio: 'inherit',
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function statusPorcelain() {
  return execSync('git status --porcelain', { encoding: 'utf8' }).trim();
}

function headCommit() {
  return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
}

const pending = statusPorcelain();
if (!pending) {
  console.log('[deploy] Nenhuma alteração para commitar. Verificando sync Vercel/Railway…');
  try {
    run('node scripts/check-deploy-sync.mjs');
  } catch {
    process.exit(1);
  }
  process.exit(0);
}

console.log('[deploy] Alterações detectadas:\n', pending, '\n');
run('npm run deploy:check');

run('git add .');

try {
  run(`git commit -m ${JSON.stringify(message)}`);
} catch {
  console.error('[deploy] Falha no git commit (hooks ou identidade git?).');
  process.exit(1);
}

// Manifest + cache-bust devem refletir o commit publicado (deploy:check roda antes do commit).
run('node scripts/write-deploy-manifest.mjs');
run('node scripts/inject-build-cache-bust.mjs');
if (statusPorcelain()) {
  run('git add .');
  run('git commit --amend --no-edit');
}

const pushedCommit = headCommit();
run('git push origin main');

try {
  run('node scripts/trigger-vercel-deploy.mjs');
} catch {
  console.warn('[deploy] Hook Vercel não disparou — confira integração Git ou redeploy manual no painel.');
}

console.log('');
console.log('[deploy] Push concluído → GitHub main');
console.log('[deploy]   • Vercel: deploy automático (se ligado ao repo)');
console.log('[deploy]   • Railway: deploy automático (se ligado ao repo)');
console.log('[deploy]   • Mesmo commit / mesmo front nos dois hosts');
console.log('');

if (noWait) {
  console.log('[deploy] --no-wait: rode depois → npm run deploy:sync-check');
  process.exit(0);
}

try {
  run('node scripts/check-deploy-sync.mjs --wait', {
    DEPLOY_EXPECT_COMMIT: pushedCommit,
  });
} catch {
  console.error('[deploy] Push OK, mas sync Vercel/Railway não confirmado a tempo.');
  console.error('[deploy] Confira os dashboards e rode: npm run deploy:sync-check');
  process.exit(1);
}
