import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTestAssetId,
  classifySmartAssetCategory,
  resolveSmartAssetCollision,
  resolveSmartAssetDepthSort,
} from './smartAssetClassification.js';

describe('smartAssetClassification', () => {
  it('classifica floor e grass como TILE_TERRAIN', () => {
    assert.equal(classifySmartAssetCategory('pack', 'grass_tile.png'), 'TILE_TERRAIN');
    assert.equal(classifySmartAssetCategory('dungeon', 'stone_floor.png'), 'TILE_TERRAIN');
  });

  it('classifica wall e building como TILE_STRUCTURE com colisão', () => {
    assert.equal(classifySmartAssetCategory('city', 'wall1.png'), 'TILE_STRUCTURE');
    assert.equal(classifySmartAssetCategory('city', 'buildings.png'), 'TILE_STRUCTURE');
    assert.equal(resolveSmartAssetCollision('TILE_STRUCTURE'), true);
  });

  it('classifica prop e bench como ENTITY_PROP com depth sort', () => {
    assert.equal(classifySmartAssetCategory('urban', 'park_bench.png'), 'ENTITY_PROP');
    assert.equal(classifySmartAssetCategory('dungeon', 'props_crate.png'), 'ENTITY_PROP');
    assert.equal(resolveSmartAssetDepthSort('ENTITY_PROP'), true);
  });

  it('gera id estável para o registro', () => {
    const id = buildTestAssetId('PNG/City1', 'road.png');
    assert.ok(id.startsWith('test_'));
    assert.ok(id.includes('road'));
  });
});
