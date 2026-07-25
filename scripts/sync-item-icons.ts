import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ITEM_CATALOG } from '../src/shared/items/itemCatalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemsRoot = path.join(root, 'public', 'assets', 'items');
const force = process.argv.includes('--force');

/**
 * Procura pasta com o mesmo id do catalogo, sob rotations/unknown.png.
 * Aceita pasta = itemId ou itemId.png (export com extensão no nome da pasta).
 */
function findUnknownPng(itemId: string, dir = itemsRoot, depth = 0): string | null {
  if (depth > 8 || !existsSync(dir)) return null;

  const folderAliases = new Set([itemId, `${itemId}.png`]);

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;

    if (folderAliases.has(entry.name)) {
      const direct = path.join(full, 'rotations', 'unknown.png');
      if (existsSync(direct)) return direct;

      for (const sub of readdirSync(full, { withFileTypes: true })) {
        if (!sub.isDirectory()) continue;
        const nested = path.join(full, sub.name, 'rotations', 'unknown.png');
        if (existsSync(nested)) return nested;
      }
    }

    const nestedHit = findUnknownPng(itemId, full, depth + 1);
    if (nestedHit) return nestedHit;
  }

  return null;
}

function main(): void {
  mkdirSync(itemsRoot, { recursive: true });

  let copied = 0;
  let skipped = 0;
  let missing = 0;
  const missingIds: string[] = [];

  for (const item of ITEM_CATALOG) {
    const itemId = item.id;
    const dest = path.join(itemsRoot, itemId + '.png');
    if (existsSync(dest) && !force) {
      skipped += 1;
      continue;
    }

    const source = findUnknownPng(itemId);
    if (!source) {
      if (!existsSync(dest)) {
        missing += 1;
        missingIds.push(itemId);
      } else {
        skipped += 1;
      }
      continue;
    }

    copyFileSync(source, dest);
    copied += 1;
    console.log('[sync:item-icons] ' + itemId + '.png <- ' + path.relative(root, source));
  }

  console.log('');
  console.log(
    '[sync:item-icons] Catalogo: '
      + ITEM_CATALOG.length
      + ' | copiados: '
      + copied
      + ' | ja existiam: '
      + skipped
      + ' | sem fonte: '
      + missing
      + (force ? ' | --force' : ''),
  );
  if (missingIds.length > 0 && missingIds.length <= 30) {
    console.log('[sync:item-icons] Sem asset: ' + missingIds.join(', '));
  } else if (missingIds.length > 30) {
    console.log(
      '[sync:item-icons] Sem asset ('
        + missingIds.length
        + '): '
        + missingIds.slice(0, 20).join(', ')
        + '...',
    );
  }
}

main();
