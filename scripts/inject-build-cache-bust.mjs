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

function isRetryableFsCode(code) {
  return code === 'UNKNOWN' || code === 'EBUSY' || code === 'EPERM' || code === 'EACCES';
}

function sleepMs(ms) {
  const waitUntil = Date.now() + ms;
  while (Date.now() < waitUntil) {
    /* spin — Windows file locks são transitórios */
  }
}

/** Windows: arquivos em public/ às vezes ficam locked (antivirus / outro node). */
function readFileSyncRetry(filePath, attempts = 10) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return readFileSync(filePath, 'utf8');
    } catch (error) {
      lastError = error;
      const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
      if (!isRetryableFsCode(code)) throw error;
      sleepMs(80 * (i + 1));
    }
  }
  throw lastError;
}

function writeFileSyncRetry(filePath, content, attempts = 10) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      writeFileSync(filePath, content, 'utf8');
      return;
    } catch (error) {
      lastError = error;
      const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
      if (!isRetryableFsCode(code)) throw error;
      sleepMs(80 * (i + 1));
    }
  }
  throw lastError;
}

let version = 'dev';
try {
  const manifest = JSON.parse(readFileSyncRetry(manifestPath));
  version = String(manifest.commitShort ?? manifest.commit ?? 'dev').slice(0, 12);
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
  if (code !== 'ENOENT') throw error;
  console.warn('[inject-build-cache-bust] deploy-manifest ausente — usando version=dev');
}

let html = readFileSyncRetry(indexPath);

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
  const source = readFileSyncRetry(filePath);
  const stamped = source.replace(
    /(from\s+['"])([^'"]+\.js)(\?v=[^'"]*)?(['"])/g,
    `$1$2?v=${version}$4`,
  );
  if (stamped !== source) {
    writeFileSyncRetry(filePath, stamped);
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
let stampFailures = 0;
for (const dir of stampRoots) {
  for (const filePath of walkJsFiles(dir)) {
    try {
      if (stampJsImports(filePath)) {
        stampedCount += 1;
      }
    } catch (error) {
      stampFailures += 1;
      console.warn('[inject-build-cache-bust] skip stamp', path.relative(root, filePath), error?.code ?? error);
    }
  }
}

writeFileSyncRetry(indexPath, html);
console.log('[inject-build-cache-bust] OK', {
  version,
  index: path.relative(root, indexPath),
  stampedFiles: stampedCount,
  stampFailures,
});
