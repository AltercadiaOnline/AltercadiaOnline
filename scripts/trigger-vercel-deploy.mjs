#!/usr/bin/env node
/**
 * Dispara rebuild na Vercel via Deploy Hook (fallback quando o webhook Git falha).
 *
 * Criar hook: Vercel → Project → Settings → Git → Deploy Hooks → branch main
 * Definir VERCEL_DEPLOY_HOOK_URL no `.env` local ou GitHub Actions secret.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

for (const file of ['.env', '.env.governance']) {
  loadEnvFile(path.join(root, file));
}

const hookUrl = (process.env.VERCEL_DEPLOY_HOOK_URL ?? '').trim();

if (!hookUrl) {
  console.log('[vercel:hook] VERCEL_DEPLOY_HOOK_URL ausente — pulando trigger manual.');
  process.exit(0);
}

let parsed;
try {
  parsed = new URL(hookUrl);
} catch {
  console.error('[vercel:hook] URL inválida em VERCEL_DEPLOY_HOOK_URL.');
  process.exit(1);
}

if (!parsed.hostname.endsWith('vercel.com')) {
  console.error('[vercel:hook] Host inesperado — esperado *.vercel.com');
  process.exit(1);
}

const response = await fetch(hookUrl, {
  method: 'POST',
  headers: { Accept: 'application/json' },
  signal: AbortSignal.timeout(30_000),
});

const body = await response.text();

if (!response.ok) {
  console.error(`[vercel:hook] Falha HTTP ${response.status}: ${body.slice(0, 200)}`);
  process.exit(1);
}

let job;
try {
  job = JSON.parse(body);
} catch {
  job = { raw: body };
}

console.log('[vercel:hook] Deploy disparado na Vercel.', {
  jobId: job?.job?.id ?? job?.id ?? '(unknown)',
  state: job?.job?.state ?? job?.state ?? '(unknown)',
});
