import { describe, expect, it } from 'vitest';
import {
  PVP_BATTLE_SKIN_REFERENCE_BUNDLE_ID,
  resolvePvpBattleSkinDrawScale,
  resolvePvpFighterDrawHeight,
  resolvePvpFighterFootPadPx,
} from './battlePvpSkinDrawScale.js';

describe('battlePvpSkinDrawScale', () => {
  it('male_1 (referência) mantém fator 1, altura base e footPad 0', () => {
    expect(PVP_BATTLE_SKIN_REFERENCE_BUNDLE_ID).toBe('player_male_1');
    expect(resolvePvpBattleSkinDrawScale('player_male_1')).toBe(1);
    expect(resolvePvpFighterDrawHeight(136, 'player_male_1')).toBe(136);
    expect(resolvePvpFighterFootPadPx(136, 'player_male_1')).toBe(0);
  });

  it('skins provisórias desenham mais altas e descem (footPad > 0)', () => {
    const base = 136;
    const male1 = resolvePvpFighterDrawHeight(base, 'player_male_1');
    const male2H = resolvePvpFighterDrawHeight(base, 'player_male_2');
    expect(male2H).toBeGreaterThan(male1);
    expect(resolvePvpFighterFootPadPx(male2H, 'player_male_2')).toBeGreaterThan(0);
    expect(resolvePvpFighterFootPadPx(base, 'player_female_1')).toBeGreaterThan(0);
  });

  it('bundle desconhecido / vazio = fator 1 e footPad 0', () => {
    expect(resolvePvpBattleSkinDrawScale(null)).toBe(1);
    expect(resolvePvpFighterFootPadPx(136, 'not_a_skin')).toBe(0);
  });
});
