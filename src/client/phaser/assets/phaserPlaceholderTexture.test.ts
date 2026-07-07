import { describe, expect, it } from 'vitest';
import {
  defaultPlaceholderSize,
  inferPlaceholderKind,
} from './phaserPlaceholderTexture.js';

describe('phaserPlaceholderTexture', () => {
  it('infere tipo por chave e URL', () => {
    expect(inferPlaceholderKind('altercadia-player-sheet', '/assets/player/south.png')).toBe('player');
    expect(inferPlaceholderKind('altercadia-creature-rato_z1')).toBe('creature');
    expect(inferPlaceholderKind('altercadia-npc-vendor_01')).toBe('npc');
    expect(inferPlaceholderKind('city01:tileset:chao', '/assets/terrain/tiles/Road2.png')).toBe('tile');
    expect(inferPlaceholderKind('city01:object:bench', '/assets/props/bench.png')).toBe('prop');
  });

  it('define tamanhos padrão por tipo', () => {
    expect(defaultPlaceholderSize('tile')).toEqual({ w: 32, h: 32 });
    expect(defaultPlaceholderSize('player').h).toBeGreaterThan(0);
  });
});
