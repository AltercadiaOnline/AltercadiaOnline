#!/usr/bin/env node
/**
 * Anexa ?v=<commitShort> nos entrypoints ES module — evita login morto por cache
 * de módulos antigos (ex.: npcDefinition.js sem NPC_ASSET_BUNDLES).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'public', 'index.html');
const manifestPath = path.join(root, 'public', 'config', 'deploy-manifest.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const version = String(manifest.commitShort ?? manifest.commit ?? 'dev').slice(0, 12);

let html = readFileSync(indexPath, 'utf8');

function bustModuleSrc(htmlContent, modulePath) {
  const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(src="${escaped})(\\?v=[^"]*)?"`, 'g');
  return htmlContent.replace(pattern, `$1?v=${version}"`);
}

for (const modulePath of ['/app-ui/ui-runtime.js', '/client/browser/main.js']) {
  html = bustModuleSrc(html, modulePath);
}

/** Cache-bust em imports críticos de NPC (NpcSpriteLoader → npcDefinition legado). */
const stampTargets = [
  path.join(root, 'public', 'client', 'loaders', 'NpcSpriteLoader.js'),
  path.join(root, 'public', 'shared', 'npc', 'npcAssetBundles.js'),
  path.join(root, 'public', 'assets', 'npcs', 'npcDefinition.js'),
];

for (const filePath of stampTargets) {
  if (!existsSync(filePath)) continue;
  const source = readFileSync(filePath, 'utf8');
  const stamped = source.replace(
    /(from\s+['"])([^'"]+\.js)(\?v=[^'"]*)?(['"])/g,
    `$1$2?v=${version}$4`,
  );
  if (stamped !== source) {
    writeFileSync(filePath, stamped, 'utf8');
  }
}

writeFileSync(indexPath, html, 'utf8');
console.log('[inject-build-cache-bust] OK', { version, index: path.relative(root, indexPath) });
