import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ZONE1_CREATURE_REGISTRY,
  ZONE1_ID,
} from '../src/shared/world/zone1CreatureRegistry.js';
import { buildCreatureSpriteUrl } from '../src/shared/assets/creatureManifest.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicZoneDir = path.join(root, 'public', 'assets', 'creatures', ZONE1_ID);

function publicUrlToFsPath(url: string): string {
  const relative = url.replace(/^\//, '').replace(/\//g, path.sep);
  return path.join(root, 'public', relative);
}

type AuditRow = {
  readonly creatureId: string;
  readonly displayName: string;
  readonly manifestId: string;
  readonly folder: string;
  readonly idleUrl: string;
  readonly attackUrl: string;
  readonly idleExists: boolean;
  readonly attackExists: boolean;
};

function resolveAuditRow(
  creatureId: string,
  folder: string,
  manifest: { id: string; displayName: string; sprites: { idle: string; attack: string } },
): AuditRow {
  const idleUrl = buildCreatureSpriteUrl(ZONE1_ID, folder, manifest.sprites.idle);
  const attackUrl = buildCreatureSpriteUrl(ZONE1_ID, folder, manifest.sprites.attack);
  return {
    creatureId,
    displayName: manifest.displayName,
    manifestId: manifest.id,
    folder,
    idleUrl,
    attackUrl,
    idleExists: existsSync(publicUrlToFsPath(idleUrl)),
    attackExists: existsSync(publicUrlToFsPath(attackUrl)),
  };
}

function main(): void {
  const rows = ZONE1_CREATURE_REGISTRY.map((entry) =>
    resolveAuditRow(entry.creatureId, entry.folder, entry.manifest),
  );
  const complete = rows.filter((row) => row.idleExists && row.attackExists);
  const missing = rows.filter((row) => !row.idleExists || !row.attackExists);

  console.log('=== Auditoria de assets de criaturas (Zona 1) ===');
  console.log(`Pasta pública: ${publicZoneDir}`);
  console.log(`Criaturas no registry: ${rows.length}`);
  console.log(`Com idle + attack: ${complete.length}`);
  console.log(`Incompletas: ${missing.length}`);
  console.log('');

  if (complete.length > 0) {
    console.log('[OK] Assets encontrados:');
    for (const row of complete) {
      console.log(`  - ${row.creatureId} (${row.displayName}) → ${row.idleUrl}`);
    }
    console.log('');
  }

  if (missing.length > 0) {
    console.log('[FALTANDO] Arquivos ausentes:');
    for (const row of missing) {
      if (!row.idleExists) console.log(`  - ${row.creatureId}: idle → ${row.idleUrl}`);
      if (!row.attackExists) console.log(`  - ${row.creatureId}: attack → ${row.attackUrl}`);
    }
    console.log('');
    console.log('Dica: node scripts/seed-zone1-creature-placeholders.mjs');
    process.exitCode = 1;
  }
}

main();
