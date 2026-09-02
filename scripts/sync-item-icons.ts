import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ITEM_CATALOG } from '../src/shared/items/itemCatalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemsRoot = path.join(root, 'public', 'assets', 'items');
const extraIconRoots = [path.join(root, 'public', 'assets', 'quests.mercenario')];
const force = process.argv.includes('--force');

function findPngInRotationsDir(dir: string): string | null {
  const rotations = path.join(dir, 'rotations');
  if (!existsSync(rotations)) return null;
  const png = readdirSync(rotations).find((name) => name.toLowerCase().endsWith('.png'));
  return png ? path.join(rotations, png) : null;
}

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
      const directUnknown = path.join(full, 'rotations', 'unknown.png');
      if (existsSync(directUnknown)) return directUnknown;
      const directAny = findPngInRotationsDir(full);
      if (directAny) return directAny;

      for (const sub of readdirSync(full, { withFileTypes: true })) {
        if (!sub.isDirectory()) continue;
        const nestedUnknown = path.join(full, sub.name, 'rotations', 'unknown.png');
        if (existsSync(nestedUnknown)) return nestedUnknown;
        const nestedAny = findPngInRotationsDir(path.join(full, sub.name));
        if (nestedAny) return nestedAny;
      }
    }

    const nestedHit = findUnknownPng(itemId, full, depth + 1);
    if (nestedHit) return nestedHit;
  }

  return null;
}

function findItemIconSource(itemId: string): string | null {
  const fromItems = findUnknownPng(itemId, itemsRoot);
  if (fromItems) return fromItems;
  for (const extraRoot of extraIconRoots) {
    const hit = findUnknownPng(itemId, extraRoot);
    if (hit) return hit;
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

    const source = findItemIconSource(itemId);
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
