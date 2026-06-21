#!/usr/bin/env node
/**
 * Aplica uma migration SQL do diretório supabase/migrations.
 *
 * Uso:
 *   node scripts/apply-supabase-migration.mjs 010
 *   node scripts/apply-supabase-migration.mjs 011_hybrid_character_persistence
 *
 * Requer DATABASE_URL em `.env` (ou `.env.governance` legado) na raiz.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = process.cwd();
const migrationArg = process.argv[2]?.trim();

if (!migrationArg) {
  console.error('Uso: node scripts/apply-supabase-migration.mjs <id>');
  console.error('Ex.: 010 | 011 | 011_hybrid_character_persistence');
  process.exit(1);
}

const migrationsDir = path.join(root, 'supabase/migrations');
const files = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'));
const match = files.find((name) => name.startsWith(`${migrationArg}_`) || name.startsWith(migrationArg));

if (!match) {
  console.error(`[migration] Arquivo não encontrado para "${migrationArg}".`);
  console.error('Disponíveis:', files.join(', '));
  process.exit(1);
}

const envCandidates = [
  path.join(root, '.env'),
  path.join(root, '.env.governance'),
];

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

for (const filePath of envCandidates) {
  loadEnvFile(filePath);
}

function resolveConnectionString() {
  const direct =
    process.env.DATABASE_URL?.trim()
    || process.env.SUPABASE_DATABASE_URL?.trim()
    || process.env.POSTGRES_URL?.trim();
  if (direct) return direct;

  const host = process.env.DATABASE_HOST?.trim();
  const user = process.env.DATABASE_USER?.trim();
  const password = process.env.DATABASE_PASSWORD?.trim();
  const name = process.env.DATABASE_NAME?.trim();
  if (!host || !user || !password || !name) return null;

  const port = Number(process.env.DATABASE_PORT?.trim() || '5432');
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(name)}`;
}

const connectionString = resolveConnectionString();

if (!connectionString) {
  console.error('[migration] DATABASE_URL ausente.');
  console.error('  Defina DATABASE_URL (sem #) ou DATABASE_HOST/USER/PASSWORD/NAME em `.env`.');
  process.exit(1);
}

const sqlPath = path.join(migrationsDir, match);
const sql = readFileSync(sqlPath, 'utf8');
const label = match.replace(/\.sql$/u, '');

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log(`[migration:${label}] Conectado — aplicando…`);
  await client.query(sql);
  console.log(`[migration:${label}] OK.`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes('already exists')
    || message.includes('duplicate')
    || message.includes('IF NOT EXISTS')
  ) {
    console.log(`[migration:${label}] Já aplicada ou idempotente (${message}).`);
    process.exit(0);
  }
  console.error(`[migration:${label}] Falha:`, message);
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
