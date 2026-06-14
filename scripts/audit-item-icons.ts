import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildDefaultItemIconPath,
  getItemIconPath,
  ITEM_CATALOG,
} from '../src/shared/items/itemCatalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemsDir = path.join(root, 'public', 'assets', 'items');

function publicUrlToFsPath(iconUrl: string): string {
  const relative = iconUrl.replace(/^\//, '').replace(/\//g, path.sep);
  return path.join(root, 'public', relative);
}

function listAssetFiles(): Set<string> {
  if (!existsSync(itemsDir)) return new Set();
  return new Set(
    readdirSync(itemsDir).filter((name) => /\.(png|svg|webp|jpg|jpeg)$/i.test(name)),
  );
}

type AuditRow = {
  readonly itemId: string;
  readonly name: string;
  readonly iconPath: string;
  readonly source: 'explicit' | 'convention';
  readonly fileName: string;
  readonly exists: boolean;
};

function resolveAuditRow(itemId: string, name: string): AuditRow {
  const item = ITEM_CATALOG.find((entry) => entry.id === itemId);
  const explicit = item?.iconPath;
  const iconPath = getItemIconPath(itemId)!;
  const fileName = path.basename(publicUrlToFsPath(iconPath));
  return {
    itemId,
    name,
    iconPath,
    source: explicit ? 'explicit' : 'convention',
    fileName,
    exists: existsSync(publicUrlToFsPath(iconPath)),
  };
}

function main(): void {
  const rows = ITEM_CATALOG.map((item) => resolveAuditRow(item.id, item.name));
  const present = rows.filter((row) => row.exists);
  const missing = rows.filter((row) => !row.exists);

  const assetFiles = listAssetFiles();
  const catalogFileNames = new Set(rows.map((row) => row.fileName));
  const orphanFiles = [...assetFiles]
    .filter((file) => file !== 'unknown.svg' && !catalogFileNames.has(file))
    .sort();

  console.log('=== Auditoria de ícones do catálogo ===');
  console.log(`Pasta: ${itemsDir}`);
  console.log(`Itens no catálogo: ${rows.length}`);
  console.log(`Com arquivo: ${present.length}`);
  console.log(`Faltando: ${missing.length}`);
  console.log('');

  if (present.length > 0) {
    console.log('[OK] Ícones encontrados:');
    for (const row of present) {
      console.log(`  - ${row.itemId} (${row.name}) -> ${row.iconPath} [${row.source}]`);
    }
    console.log('');
  }

  if (missing.length > 0) {
    console.log('[FALTANDO] Sem arquivo no disco:');
    for (const row of missing) {
      const expected = buildDefaultItemIconPath(row.itemId);
      console.log(`  - ${row.itemId} (${row.name}) -> esperado: ${expected}`);
    }
    console.log('');
  }

  if (orphanFiles.length > 0) {
    console.log('[ÓRFÃOS] Arquivos em /public/assets/items/ sem item no catálogo:');
    for (const file of orphanFiles) {
      console.log(`  - ${file}`);
    }
    console.log('');
  }

  if (missing.length > 0) {
    process.exitCode = 1;
  }
}

main();
