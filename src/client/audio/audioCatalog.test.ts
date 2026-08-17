import { describe, expect, it } from 'vitest';
import {
  clampAudioVolume,
  MENU_BGM_TRACK_ID,
  resolveBgmUrls,
  shouldPlayMenuBgm,
} from './audioCatalog.js';

describe('audioCatalog', () => {
  it('aponta o BGM de menu para ogg e mp3', () => {
    expect(resolveBgmUrls(MENU_BGM_TRACK_ID)).toEqual([
      '/assets/audio/bgm/login.ogg',
      '/assets/audio/bgm/login.mp3',
    ]);
  });

  it('limita volume a 0..1', () => {
    expect(clampAudioVolume(-1)).toBe(0);
    expect(clampAudioVolume(2)).toBe(1);
    expect(clampAudioVolume(0.4)).toBe(0.4);
    expect(clampAudioVolume(Number.NaN)).toBe(0);
  });

  it('toca no login e na seleção, mas não com enter-world travado', () => {
    expect(shouldPlayMenuBgm('login-screen', false)).toBe(true);
    expect(shouldPlayMenuBgm('char-select-screen', false)).toBe(true);
    expect(shouldPlayMenuBgm('char-select-screen', true)).toBe(false);
    expect(shouldPlayMenuBgm('game-container', false)).toBe(false);
  });
});
