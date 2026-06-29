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
const isLocalAudit = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

const failures = [];
const warnings = [];

async function fetchJsonUrl(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { url, status: response.status, ok: response.ok, body };
}

async function fetchJson(path) {
  return fetchJsonUrl(`${baseUrl}${path}`);
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

let clientConfig = null;
const config = await fetchJson('/config/client');
if (!config.ok) {
  fail(`/config/client → ${config.status}`);
} else {
  pass(`/config/client → ${config.status}`);
  const c = config.body ?? {};
  clientConfig = c;

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

  if (typeof c.gameHttpUrl === 'string' && c.gameHttpUrl.startsWith('http')) {
    pass(`gameHttpUrl presente (${c.gameHttpUrl})`);
  } else if (baseUrl.includes('localhost')) {
    warn('gameHttpUrl ausente — OK para localhost dev');
  } else {
    fail('GAME_HTTP_URL ausente em /config/client');
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

if (clientConfig?.gameHttpUrl) {
  const gameHttpUrl = String(clientConfig.gameHttpUrl).replace(/\/+$/, '');
  try {
    const ready = await fetchJsonUrl(`${gameHttpUrl}/ready`);
    if (!ready.ok || ready.body?.ok !== true) {
      const failedChecks = Array.isArray(ready.body?.checks)
        ? ready.body.checks
            .filter((check) => check && check.ok === false)
            .map((check) => `${check.name}${check.detail ? ` (${check.detail})` : ''}`)
        : [];
      fail(
        `/ready Railway falhou → ${ready.status}${failedChecks.length ? `: ${failedChecks.join(', ')}` : ''}`,
      );
    } else {
      const readyServerId = ready.body?.serverId;
      pass(`/ready Railway → ${ready.status}${readyServerId ? ` (${readyServerId})` : ''}`);

      if (
        typeof clientConfig.serverId === 'string'
        && typeof readyServerId === 'string'
        && clientConfig.serverId !== readyServerId
      ) {
        fail(`SERVER_ID divergente: Vercel=${clientConfig.serverId} Railway=${readyServerId}`);
      }
    }
  } catch (error) {
    fail(`/ready Railway indisponível: ${error instanceof Error ? error.message : String(error)}`);
  }
} else if (isLocalAudit) {
  warn('/ready Railway não testado — gameHttpUrl ausente em localhost');
} else {
  fail('/ready Railway não testado — gameHttpUrl ausente');
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
