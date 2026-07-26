#!/usr/bin/env node
/**
 * Auditoria pós-build — garante que módulos ES críticos existem em public/
 * (evita login morto na Vercel quando um import 404 retorna index.html).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');

const REQUIRED_STATIC_MODULES = [
  'client/browser/main.js',
  'client/ui/ambient/AmbientOverlay.js',
  'client/services/loginScreen.js',
  'config/designConstants.js',
  'config/sceneConfig.js',
  'game/constants/GameConfig.js',
  'game/assets/assetNormalizer.js',
  'game/assetAtlasImageLoader.js',
  'game/generated/city01TestPackWiring.js',
  'game/AssetRegistry.js',
  'shared/world/npcRegistry.js',
  'shared/npc/npcAssetBundles.js',
  'assets/processed/tilesets/chao_madeira_Road2.png',
  'config/processedAssetManifest.js',
  'shared/world/zone1CreatureRegistry.js',
  'assets/creatures/zone1/aranha/manifest.json',
  'assets/creatures/zone1/cao_selvagem/manifest.json',
  'assets/creatures/zone1/corvo/manifest.json',
  'assets/creatures/zone1/morcego/manifest.json',
  'assets/creatures/zone1/rato/manifest.json',
  'assets/terrain/groundTileManifest.js',
  'assets/npcs/npcDefinition.js',
  'vendor/gsap/index.js',
  'app-ui/ui-runtime.js',
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

const npcDefinitionPath = path.join(publicDir, 'assets', 'npcs', 'npcDefinition.js');
const npcAssetBundlesPath = path.join(publicDir, 'shared', 'npc', 'npcAssetBundles.js');
const npcDefinitionSource = readFileSync(npcDefinitionPath, 'utf8');
const npcAssetBundlesSource = readFileSync(npcAssetBundlesPath, 'utf8');
if (!npcAssetBundlesSource.includes('export const NPC_ASSET_BUNDLES')) {
  console.error(
    '[audit-static-bundle] shared/npc/npcAssetBundles.js desatualizado — falta export NPC_ASSET_BUNDLES. Rode npm run build:sync.',
  );
  process.exit(1);
}
if (!npcDefinitionSource.includes('NPC_ASSET_BUNDLES')) {
  console.error(
    '[audit-static-bundle] assets/npcs/npcDefinition.js desatualizado — falta export NPC_ASSET_BUNDLES. Rode npm run build:sync.',
  );
  process.exit(1);
}

console.log(`[audit-static-bundle] OK — ${REQUIRED_STATIC_MODULES.length} módulos críticos presentes.`);

// MockEconomyService não pode ir para a CDN — só dist/ (dev localhost).
const forbiddenMockPaths = [
  path.join(publicDir, 'client', 'testing', 'MockEconomyService.js'),
];
const forbiddenMockFound = forbiddenMockPaths.filter((p) => existsSync(p));
if (forbiddenMockFound.length > 0) {
  console.error('[audit-static-bundle] MockEconomyService vazou para public/ (bloqueado):');
  for (const entry of forbiddenMockFound) {
    console.error(`  - ${path.relative(path.join(publicDir, '..'), entry)}`);
  }
  process.exit(1);
}

const appUiChunks = path.join(publicDir, 'app-ui', 'chunks');
if (existsSync(appUiChunks)) {
  const mockChunks = readdirSync(appUiChunks).filter((name) =>
    name.startsWith('MockEconomyService-') && name.endsWith('.js'),
  );
  if (mockChunks.length > 0) {
    console.error('[audit-static-bundle] Chunk MockEconomyService no app-ui (bloqueado):');
    for (const name of mockChunks) console.error(`  - app-ui/chunks/${name}`);
    console.error('  Use dataStoreAccess.ts nos painéis React — não economyLayer.ts.');
    process.exit(1);
  }
}

console.log('[audit-static-bundle] OK — Mock fora de public/client/testing e app-ui.');

