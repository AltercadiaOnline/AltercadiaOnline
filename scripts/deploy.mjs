#!/usr/bin/env node
/**
 * Deploy Altercadia V2 → GitHub (main) → Vercel automático (se ligado ao repo).
 * Uso:
 *   npm run deploy
 *   npm run deploy -- "feat: nova mecanica de combate"
 *   DEPLOY_MSG="fix: cors" npm run deploy
 */
import { execSync } from 'node:child_process';

const message =
  process.argv[2] ??
  process.env.DEPLOY_MSG ??
  `deploy: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', encoding: 'utf8' });
}

function statusPorcelain() {
  return execSync('git status --porcelain', { encoding: 'utf8' }).trim();
}

const pending = statusPorcelain();
if (!pending) {
  console.log('[deploy] Nenhuma alteração para commitar. Push ignorado.');
  process.exit(0);
}

console.log('[deploy] Alterações detectadas:\n', pending, '\n');
run('git add .');

try {
  run(`git commit -m ${JSON.stringify(message)}`);
} catch {
  console.error('[deploy] Falha no git commit (hooks ou identidade git?).');
  process.exit(1);
}

run('git push origin main');
console.log('[deploy] Push concluído → Vercel deve iniciar deploy na branch main (se o projeto estiver ligado ao GitHub).');
