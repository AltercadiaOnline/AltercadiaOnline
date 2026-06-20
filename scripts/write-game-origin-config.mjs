#!/usr/bin/env node
/**
 * Embute URLs públicas do Railway em public/config/game-origin.json no build (Vercel).
 * Fallback quando /config/client não expõe GAME_WS_URL em runtime.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'config');
const outFile = path.join(outDir, 'game-origin.json');

function deriveHttpFromWs(wsUrl) {
  const trimmed = wsUrl?.trim() ?? '';
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol === 'wss:' ? 'https:' : parsed.protocol === 'ws:' ? 'http:' : parsed.protocol;
    return `${protocol}//${parsed.host}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

const gameWsUrl = (process.env.GAME_WS_URL ?? process.env.PUBLIC_GAME_WS_URL ?? '').trim() || null;
const gameHttpUrl =
  (process.env.GAME_HTTP_URL ?? process.env.PUBLIC_GAME_HTTP_URL ?? '').trim()
  || deriveHttpFromWs(gameWsUrl);

const payload = {
  gameWsUrl,
  gameHttpUrl,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

if (gameWsUrl || gameHttpUrl) {
  console.log('[write-game-origin] OK', { gameWsUrl, gameHttpUrl });
} else {
  console.warn('[write-game-origin] GAME_WS_URL ausente — game-origin.json vazio (split Vercel+Railway quebrado).');
}
