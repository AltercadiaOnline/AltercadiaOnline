#!/usr/bin/env node
/**
 * Anexa ?v=<commitShort> nos entrypoints ES module — evita login morto por cache
 * de módulos antigos (ex.: npcDefinition.js sem hasNpcAssetBundle).
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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

function bustStylesheetHref(htmlContent, hrefPath) {
  const escaped = hrefPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(href="${escaped})(\\?v=[^"]*)?"`, 'g');
  return htmlContent.replace(pattern, `$1?v=${version}"`);
}

for (const modulePath of ['/app-ui/ui-runtime.js', '/client/browser/main.js']) {
  html = bustModuleSrc(html, modulePath);
}

for (const stylesheetPath of ['/app-ui/ui-runtime.css', '/styles.css']) {
  html = bustStylesheetHref(html, stylesheetPath);
}

const buildStampTag = `<script>window.__ALTERCADIA_BUILD__="${version}";</script>`;
if (html.includes('window.__ALTERCADIA_BUILD__')) {
  html = html.replace(
    /<script>window\.__ALTERCADIA_BUILD__="[^"]*";<\/script>/,
    buildStampTag,
  );
} else {
  html = html.replace('</head>', `    ${buildStampTag}\n  </head>`);
}

function stampJsImports(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const stamped = source.replace(
    /(from\s+['"])([^'"]+\.js)(\?v=[^'"]*)?(['"])/g,
    `$1$2?v=${version}$4`,
  );
  if (stamped !== source) {
    writeFileSync(filePath, stamped, 'utf8');
    return true;
  }
  return false;
}

function walkJsFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'vendor' || entry === 'node_modules') continue;
      walkJsFiles(full, out);
      continue;
    }
    if (entry.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

/** Cache-bust em todos os imports .js do bundle estático (evita npcDefinition legado no cache). */
const stampRoots = [
  path.join(root, 'public', 'client'),
  path.join(root, 'public', 'shared'),
  path.join(root, 'public', 'assets'),
  path.join(root, 'public', 'config'),
  path.join(root, 'public', 'game'),
  path.join(root, 'public', 'app-ui'),
];

let stampedCount = 0;
for (const dir of stampRoots) {
  for (const filePath of walkJsFiles(dir)) {
    if (stampJsImports(filePath)) {
      stampedCount += 1;
    }
  }
}

writeFileSync(indexPath, html, 'utf8');
console.log('[inject-build-cache-bust] OK', {
  version,
  index: path.relative(root, indexPath),
  stampedFiles: stampedCount,
});
