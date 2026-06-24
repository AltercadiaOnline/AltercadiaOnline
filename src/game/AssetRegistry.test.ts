import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GENERATED_TEST_ASSET_STATS,
  get,
  getRegistryAsset,
  listAssetsByCategory,
  resolveAssetId,
  TILESET_ATLAS_URL,
} from './AssetRegistry.js';

describe('AssetRegistry', () => {
  it('resolve chaves legadas via wiring do pack de testes', () => {
    const streetLight = resolveAssetId('street_light');
    assert.ok(streetLight);
    assert.ok(streetLight.includes('road_lamps') || streetLight.includes('lamp'));

    const bench = resolveAssetId('park_bench');
    assert.ok(bench);

    const grass = resolveAssetId('ground_grass');
    assert.ok(grass);
    assert.notEqual(grass, 'chao_grama');
  });

  it('get retorna frame virtual para asset do pack', () => {
    const road = get('ground_road');
    assert.ok(road);
    assert.equal(road?.width, 40);
    assert.equal(road?.height, 40);
  });

  it('expõe URL pública do atlas ativo', () => {
    assert.equal(TILESET_ATLAS_URL, '/assets/tilesets/tileset_v1.png');
  });

  it('mapeia automaticamente PNGs do pack testes.01.assets.free', () => {
    assert.equal(GENERATED_TEST_ASSET_STATS.total, 383);
    assert.ok(GENERATED_TEST_ASSET_STATS.terrain >= 1);
    assert.ok(GENERATED_TEST_ASSET_STATS.structure >= 1);
    assert.ok(GENERATED_TEST_ASSET_STATS.props >= 1);
  });

  it('classifica buildings.png como TILE_STRUCTURE com colisão', () => {
    const asset = getRegistryAsset('buildings.png');
    assert.ok(asset);
    assert.equal(asset?.category, 'TILE_STRUCTURE');
    assert.equal(asset?.collision, true);
    assert.equal(asset?.depthSort, false);
    assert.equal(asset?.width, 40);
    assert.equal(asset?.height, 40);
    assert.ok(asset?.url?.includes('testes.01.assets.free'));
  });

  it('agrupa assets gerados por categoria', () => {
    const terrain = listAssetsByCategory('TILE_TERRAIN');
    const structure = listAssetsByCategory('TILE_STRUCTURE');
    const props = listAssetsByCategory('ENTITY_PROP');

    assert.ok(terrain.some((item) => item.source === 'file'));
    assert.ok(structure.every((item) => item.collision));
    assert.ok(props.every((item) => item.depthSort));
  });

  it('wiring city01 mapeia terreno, estruturas e props urbanos', () => {
    const road = getRegistryAsset('ground_road');
    assert.equal(road?.source, 'file');
    assert.equal(road?.category, 'TILE_TERRAIN');

    assert.ok(resolveAssetId('market_hall'));
    assert.ok(resolveAssetId('street_light'));
    assert.ok(resolveAssetId('park_bench'));
  });
});
