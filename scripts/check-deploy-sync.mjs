#!/usr/bin/env node
/**
 * Compara deploy Vercel vs Railway via GET /config/deploy-manifest.json
 *
 * Uso:
 *   node scripts/check-deploy-sync.mjs
 *   node scripts/check-deploy-sync.mjs --wait
 *   DEPLOY_EXPECT_COMMIT=abc123 node scripts/check-deploy-sync.mjs
 */
import { execSync } from 'node:child_process';

const VERCEL_URL = (process.env.VERCEL_DEPLOY_URL ?? 'https://altercadia-online.vercel.app').replace(/\/+$/, '');
const RAILWAY_URL = (process.env.RAILWAY_DEPLOY_URL ?? 'https://altercadiaonline-production-631f.up.railway.app').replace(/\/+$/, '');
const MANIFEST_PATH = '/config/deploy-manifest.json';
const WAIT = process.argv.includes('--wait');
const POLL_MS = Number(process.env.DEPLOY_SYNC_POLL_MS ?? 15_000);
const TIMEOUT_MS = Number(process.env.DEPLOY_SYNC_TIMEOUT_MS ?? 600_000);

function localHeadCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

async function fetchManifest(baseUrl) {
  const url = `${baseUrl}${MANIFEST_PATH}`;
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      return { ok: false, url, status: response.status, manifest: null };
    }
    const manifest = await response.json();
    return { ok: true, url, status: response.status, manifest };
  } catch (error) {
    return {
      ok: false,
      url,
      status: 'error',
      manifest: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function describeTarget(label, result) {
  if (!result.ok || !result.manifest) {
    return `${label}: indisponível (${result.url} → ${result.status}${result.error ? ` ${result.error}` : ''})`;
  }
  const m = result.manifest;
  return `${label}: ${m.commitShort ?? m.commit?.slice(0, 7) ?? '?'} @ ${m.builtAt ?? '?'}`;
}

function analyze(vercel, railway, expectedCommit) {
  const lines = [describeTarget('Vercel', vercel), describeTarget('Railway', railway)];

  const vCommit = vercel.manifest?.commit ?? null;
  const rCommit = railway.manifest?.commit ?? null;

  if (!vCommit || !rCommit) {
    return {
      synced: false,
      reason: 'manifest_ausente',
      lines,
      vCommit,
      rCommit,
    };
  }

  if (vCommit !== rCommit) {
    return {
      synced: false,
      reason: 'commits_diferentes',
      lines,
      vCommit,
      rCommit,
    };
  }

  if (expectedCommit && vCommit !== expectedCommit) {
    return {
      synced: false,
      reason: 'aguardando_commit_esperado',
      lines,
      vCommit,
      rCommit,
    };
  }

  return {
    synced: true,
    reason: 'ok',
    lines,
    vCommit,
    rCommit,
  };
}

function printReport(result, expectedCommit) {
  console.log('[deploy:sync] Alvos');
  for (const line of result.lines) {
    console.log(`  ${line}`);
  }
  if (expectedCommit) {
    console.log(`[deploy:sync] Commit local esperado: ${expectedCommit.slice(0, 7)}`);
  }
}

async function checkOnce(expectedCommit) {
  const [vercel, railway] = await Promise.all([
    fetchManifest(VERCEL_URL),
    fetchManifest(RAILWAY_URL),
  ]);
  return analyze(vercel, railway, expectedCommit);
}

async function main() {
  const expectedCommit = process.env.DEPLOY_EXPECT_COMMIT?.trim() || (WAIT ? localHeadCommit() : null);

  if (WAIT) {
    console.log('[deploy:sync] Aguardando Vercel + Railway publicarem o mesmo commit…');
    const started = Date.now();

    while (Date.now() - started < TIMEOUT_MS) {
      const result = await checkOnce(expectedCommit);
      printReport(result, expectedCommit);

      if (result.synced) {
        console.log('[deploy:sync] OK — Vercel e Railway no mesmo commit.');
        process.exit(0);
      }

      const elapsed = Math.round((Date.now() - started) / 1000);
      console.log(`[deploy:sync] Ainda não sincronizado (${result.reason}). Retry em ${POLL_MS / 1000}s… (${elapsed}s)`);
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }

    console.error('[deploy:sync] Timeout — Vercel/Railway não sincronizaram a tempo.');
    process.exit(1);
  }

  const result = await checkOnce(expectedCommit);
  printReport(result, expectedCommit);

  if (!result.synced) {
    if (result.reason === 'manifest_ausente') {
      console.log('[deploy:sync] Manifest ainda não existe — normal antes do primeiro deploy com esta feature.');
      console.log('[deploy:sync] Rode npm run deploy (jpush) e tente de novo.');
    } else if (result.reason === 'commits_diferentes') {
      console.error('[deploy:sync] FALHA — commits diferentes entre Vercel e Railway.');
    } else {
      console.error(`[deploy:sync] FALHA — ${result.reason}`);
    }
    process.exit(1);
  }

  console.log('[deploy:sync] OK — Vercel e Railway sincronizados.');
}

await main();
