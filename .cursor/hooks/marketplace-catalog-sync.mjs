#!/usr/bin/env node
/**
 * Hook Cursor — após editar catálogo de itens, valida sync automático com marketplace P2P.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let payload = {};
try {
  const raw = readFileSync(0, 'utf8');
  if (raw.trim()) payload = JSON.parse(raw);
} catch {
  payload = {};
}

const filePath = typeof payload.file_path === 'string' ? payload.file_path : '';
const normalized = filePath.replace(/\\/g, '/');

const watched = [
  'src/shared/items/itemCatalogEntries.ts',
  'src/shared/items/lootItemEconomyRegistry.ts',
  'src/shared/items/marketplaceCatalogDefaults.ts',
  'src/shared/items/itemCatalog.ts',
];

if (!watched.some((segment) => normalized.endsWith(segment))) {
  process.exit(0);
}

const audit = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'audit:marketplace-catalog'],
  { cwd: root, encoding: 'utf8' },
);

if (audit.status === 0) {
  const output = {
    additional_context: [
      'Marketplace P2P: catálogo validado — novos itens tradable entram automaticamente no browse ALL via applyMarketplaceCatalogDefaults.',
      'Opcional: sobrescreva preço/raridade em lootItemEconomyRegistry.ts para drops balanceados.',
    ].join('\n'),
  };
  process.stdout.write(`${JSON.stringify(output)}\n`);
  process.exit(0);
}

const stderr = `${audit.stdout ?? ''}\n${audit.stderr ?? ''}`.trim();
const output = {
  additional_context: [
    'Marketplace P2P: auditoria falhou após editar catálogo de itens.',
    stderr || 'Verifique scripts/audit-marketplace-catalog.ts',
    'Regra: todo item tradable precisa aparecer no browse ALL (valorBase automático ou LOOT_ECONOMY_REGISTRY).',
  ].join('\n'),
};
process.stdout.write(`${JSON.stringify(output)}\n`);
process.exit(0);
