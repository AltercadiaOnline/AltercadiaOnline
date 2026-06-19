#!/usr/bin/env node
/**
 * Smoke test de login/deploy — valida endpoints públicos antes do push.
 *
 * Uso:
 *   node scripts/audit-login-deploy.mjs
 *   AUDIT_BASE_URL=https://altercadia-online.vercel.app node scripts/audit-login-deploy.mjs
 *   AUDIT_GAME_WS_URL=wss://....railway.app/ws node scripts/audit-login-deploy.mjs
 */
const baseUrl = (process.env.AUDIT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const expectedGameWs = process.env.AUDIT_GAME_WS_URL?.trim() || null;

const failures = [];
const warnings = [];

async function fetchJson(path) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { url, status: response.status, ok: response.ok, body };
}

function pass(message) {
  console.log(`  ✓ ${message}`);
}

function warn(message) {
  warnings.push(message);
  console.log(`  ! ${message}`);
}

function fail(message) {
  failures.push(message);
  console.log(`  ✗ ${message}`);
}

console.log(`[audit:login] Base URL: ${baseUrl}`);

const health = await fetchJson('/health');
if (health.ok) {
  pass(`/health → ${health.status}`);
} else {
  fail(`/health → ${health.status}`);
}

const config = await fetchJson('/config/client');
if (!config.ok) {
  fail(`/config/client → ${config.status}`);
} else {
  pass(`/config/client → ${config.status}`);
  const c = config.body ?? {};

  if (c.supabaseUrl && c.supabaseAnonKey) {
    pass('Supabase configurado em /config/client');
  } else if (baseUrl.includes('localhost')) {
    warn('Supabase ausente — OK para localhost dev');
  } else {
    fail('SUPABASE_URL / SUPABASE_ANON_KEY ausentes em /config/client');
  }

  if (typeof c.gameWsUrl === 'string' && c.gameWsUrl.startsWith('ws')) {
    pass(`gameWsUrl presente (${c.gameWsUrl})`);
    if (expectedGameWs && c.gameWsUrl !== expectedGameWs) {
      warn(`gameWsUrl difere do esperado: ${expectedGameWs}`);
    }
  } else if (baseUrl.includes('localhost')) {
    warn('gameWsUrl ausente — OK para localhost dev');
  } else {
    fail('GAME_WS_URL ausente em /config/client');
  }

  if (typeof c.serverId === 'string' && c.serverId.trim()) {
    pass(`serverId = ${c.serverId}`);
  } else {
    fail('SERVER_ID ausente em /config/client');
  }
}

const servers = await fetchJson('/api/servers');
if (servers.ok && servers.body?.ok === true && Array.isArray(servers.body.servers)) {
  pass(`/api/servers → ${servers.body.servers.length} shard(s)`);
} else {
  fail('/api/servers indisponível ou resposta inválida');
}

console.log('');
if (warnings.length) {
  console.log(`Avisos (${warnings.length}):`);
  for (const message of warnings) console.log(`  - ${message}`);
  console.log('');
}

if (failures.length) {
  console.error(`Falhou com ${failures.length} erro(s).`);
  process.exit(1);
}

console.log('Login/deploy audit OK.');
process.exit(0);
