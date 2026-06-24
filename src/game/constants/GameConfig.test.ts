import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GAME_CONFIG,
  GAME_MAP_HEIGHT_PX,
  GAME_MAP_WIDTH_PX,
  resolvePlayerDepthY,
  resolvePlayerFeetWorldY,
} from './GameConfig.js';

describe('GameConfig', () => {
  it('define grid e viewport oficiais', () => {
    assert.equal(GAME_CONFIG.TILE_SIZE, 40);
    assert.equal(GAME_CONFIG.VIEWPORT_WIDTH, 640);
    assert.equal(GAME_CONFIG.VIEWPORT_HEIGHT, 360);
    assert.equal(GAME_CONFIG.MAP_WIDTH_TILES, 38);
    assert.equal(GAME_CONFIG.MAP_HEIGHT_TILES, 60);
  });

  it('calcula mapa em pixels', () => {
    assert.equal(GAME_MAP_WIDTH_PX, 1520);
    assert.equal(GAME_MAP_HEIGHT_PX, 2400);
  });

  it('profundidade usa Y dos pés (tile base)', () => {
    assert.equal(resolvePlayerFeetWorldY(100), 120);
    assert.equal(resolvePlayerDepthY(200, 100), 120);
  });

  it('hitbox do jogador 35×54 com pivot nos pés', () => {
    assert.equal(GAME_CONFIG.PLAYER_WIDTH, 35);
    assert.equal(GAME_CONFIG.PLAYER_HEIGHT, 54);
    assert.ok(GAME_CONFIG.PLAYER_HEIGHT > GAME_CONFIG.TILE_SIZE);
    assert.equal(GAME_CONFIG.PLAYER_FOOT_OFFSET.x, 17.5);
    assert.equal(GAME_CONFIG.PLAYER_FOOT_OFFSET.y, 54);
  });
});
