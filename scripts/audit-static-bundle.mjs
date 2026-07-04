#!/usr/bin/env node
/**
 * Auditoria pós-build — garante que módulos ES críticos existem em public/
 * (evita login morto na Vercel quando um import 404 retorna index.html).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');

const REQUIRED_STATIC_MODULES = [
  'client/browser/main.js',
  'client/ui/ambient/AmbientOverlay.js',
  'client/services/loginScreen.js',
  'client/app/runtime/mountHudRuntime.js',
  'config/designConstants.js',
  'config/maps/city01TiledMap.json',
  'config/maps/farmZone01TiledMap.json',
  'config/sceneConfig.js',
  'game/constants/GameConfig.js',
  'game/assets/assetNormalizer.js',
  'game/assetAtlasImageLoader.js',
  'game/generated/city01TestPackWiring.js',
  'game/AssetRegistry.js',
  'shared/world/npcRegistry.js',
  'shared/npc/npcAssetBundles.js',
  'assets/urban/urbanAssetManifest.js',
  'shared/world/zone1CreatureRegistry.js',
  'assets/creatures/zone1/aranha/manifest.json',
  'assets/creatures/zone1/cao_selvagem/manifest.json',
  'assets/creatures/zone1/corvo/manifest.json',
  'assets/creatures/zone1/morcego/manifest.json',
  'assets/creatures/zone1/rato/manifest.json',
  'assets/terrain/groundTileManifest.js',
  'assets/npcs/npcDefinition.js',
  'vendor/gsap/index.js',
  'vendor/phaser/phaser.esm.js',
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
