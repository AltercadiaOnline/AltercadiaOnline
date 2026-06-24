/**
 * Smoke test — wiring city01 + pack de testes (sem browser).
 */
import { buildCity01PlaceholderScene } from '../src/client/world/city01PlaceholderLayout.js';
import { getRegistryAsset, resolveAssetId } from '../src/game/AssetRegistry.js';
import { CITY_01_TEST_PACK_WIRING_STATS } from '../src/game/generated/city01TestPackWiring.js';

const scene = buildCity01PlaceholderScene();
const testPackEntities = scene.entities.filter((entity) => {
  const asset = getRegistryAsset(entity.assetKey);
  return asset?.source === 'file';
});
const road = getRegistryAsset('ground_road');

console.log('[verify:test-pack] Wiring stats:', CITY_01_TEST_PACK_WIRING_STATS);
console.log('[verify:test-pack] Total entities:', scene.entities.length);
console.log('[verify:test-pack] Test pack entities:', testPackEntities.length);
console.log('[verify:test-pack] ground_road:', {
  source: road?.source,
  category: road?.category,
  url: road?.url,
});
console.log('[verify:test-pack] resolve ground_road:', resolveAssetId('ground_road'));

if (testPackEntities.length < 300) {
  console.error('[verify:test-pack] FAIL — esperado 300+ entidades do pack');
  process.exit(1);
}

if (road?.source !== 'file' || !road.url?.endsWith('.png')) {
  console.error('[verify:test-pack] FAIL — ground_road não aponta para PNG do pack');
  process.exit(1);
}

console.log('[verify:test-pack] OK');
