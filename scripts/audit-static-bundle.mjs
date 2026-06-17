#!/usr/bin/env node
/**
 * Auditoria pós-build — garante que módulos ES críticos existem em public/
 * (evita login morto na Vercel quando um import 404 retorna index.html).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');

const REQUIRED_STATIC_MODULES = [
  'client/browser/main.js',
  'config/designConstants.js',
  'config/sceneConfig.js',
  'shared/world/npcRegistry.js',
  'assets/urban/urbanAssetManifest.js',
  'assets/terrain/groundTileManifest.js',
  'assets/npcs/npcDefinition.js',
  'vendor/gsap/index.js',
];

const missing = REQUIRED_STATIC_MODULES.filter(
  (relativePath) => !existsSync(path.join(publicDir, relativePath)),
);

if (missing.length > 0) {
  console.error('[audit-static-bundle] Módulos ausentes em public/:');
  for (const entry of missing) {
    console.error(`  - ${entry}`);
  }
  process.exit(1);
}

console.log(`[audit-static-bundle] OK — ${REQUIRED_STATIC_MODULES.length} módulos críticos presentes.`);
