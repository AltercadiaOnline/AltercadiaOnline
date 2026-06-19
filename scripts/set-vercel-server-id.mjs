#!/usr/bin/env node
/**
 * Define SERVER_ID=azul no projeto Vercel (Production + Preview + Development).
 *
 * Pré-requisito: Vercel CLI autenticado (`npx vercel login`) ou VERCEL_TOKEN no ambiente.
 *
 * Uso:
 *   node scripts/set-vercel-server-id.mjs
 *   node scripts/set-vercel-server-id.mjs roxo
 */
import { execSync } from 'node:child_process';

const serverId = (process.argv[2] ?? 'azul').trim().toLowerCase();
const environments = ['production', 'preview', 'development'];

console.log(`[vercel] Definindo SERVER_ID=${serverId}…`);

for (const env of environments) {
  try {
    execSync(
      `npx vercel env add SERVER_ID ${env} --force`,
      {
        input: `${serverId}\n`,
        stdio: ['pipe', 'inherit', 'inherit'],
        encoding: 'utf8',
      },
    );
    console.log(`[vercel] SERVER_ID=${serverId} → ${env}`);
  } catch (error) {
    console.error(`[vercel] Falha em ${env}:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

console.log('[vercel] Concluído. Rode um redeploy na Vercel para /config/client refletir o novo shard.');
