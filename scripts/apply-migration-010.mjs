#!/usr/bin/env node
/**
 * Aplica supabase/migrations/010_immutable_profile_server_id.sql no Postgres.
 *
 * Uso:
 *   DATABASE_URL="postgresql://postgres:...@db.rnlozvoclkozpguzwjtx.supabase.co:5432/postgres" node scripts/apply-migration-010.mjs
 *
 * Ou com .env.governance na raiz do projeto (DATABASE_URL ou SUPABASE_DATABASE_URL).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = process.cwd();
const governancePath = path.join(root, '.env.governance');

function loadGovernanceDatabaseUrl() {
  if (!existsSync(governancePath)) return null;
  const content = readFileSync(governancePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if ((key === 'DATABASE_URL' || key === 'SUPABASE_DATABASE_URL') && value) {
      return value;
    }
  }
  return null;
}

const connectionString =
  process.env.DATABASE_URL?.trim()
  || process.env.SUPABASE_DATABASE_URL?.trim()
  || loadGovernanceDatabaseUrl();

if (!connectionString) {
  console.error('[migration-010] DATABASE_URL ausente.');
  console.error('  Defina DATABASE_URL ou crie .env.governance (ver .env.governance.example).');
  process.exit(1);
}

const sqlPath = path.join(root, 'supabase/migrations/010_immutable_profile_server_id.sql');
const sql = readFileSync(sqlPath, 'utf8');

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('[migration-010] Conectado — aplicando trigger server_id imutável…');
  await client.query(sql);

  const check = await client.query(`
    SELECT tgname
    FROM pg_trigger
    WHERE tgname = 'profiles_server_id_immutable'
  `);

  if (check.rowCount && check.rowCount > 0) {
    console.log('[migration-010] OK — trigger profiles_server_id_immutable ativo.');
  } else {
    console.warn('[migration-010] SQL executado, mas trigger não encontrado — revise manualmente.');
    process.exit(1);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('already exists') || message.includes('duplicate')) {
    console.log('[migration-010] Já aplicada (objeto existente).');
    process.exit(0);
  }
  console.error('[migration-010] Falha:', message);
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
