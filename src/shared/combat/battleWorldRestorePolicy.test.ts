import { describe, expect, it } from 'vitest';
import { BattleType } from './battleType.js';
import {
  resolveBattleArenaMode,
  shouldCityRespawnAfterBattle,
} from './battleWorldRestorePolicy.js';

describe('battleWorldRestorePolicy', () => {
  it('PVE derrota → cidade', () => {
    expect(shouldCityRespawnAfterBattle({
      battleType: BattleType.PVE,
      victory: false,
    })).toBe(true);
  });

  it('PVE fuga → sem cidade', () => {
    expect(shouldCityRespawnAfterBattle({
      battleType: BattleType.PVE,
      victory: false,
      endReason: 'FORFEIT',
    })).toBe(false);
  });

  it('PVP rankeado derrota → mesma pose (sem fantasma)', () => {
    expect(shouldCityRespawnAfterBattle({
      battleType: BattleType.PVP,
      victory: false,
    })).toBe(false);
    expect(shouldCityRespawnAfterBattle({
      battleType: BattleType.PVP,
      victory: false,
      endReason: 'FORFEIT',
    })).toBe(false);
  });

  it('PVP casual derrota → cidade (como PVE)', () => {
    expect(shouldCityRespawnAfterBattle({
      battleType: BattleType.PVP,
      victory: false,
      casualPvp: true,
    })).toBe(true);
    expect(shouldCityRespawnAfterBattle({
      battleType: BattleType.PVP,
      victory: false,
      endReason: 'FORFEIT',
      casualPvp: true,
    })).toBe(false);
  });

  it('vitória nunca teleporta', () => {
    expect(shouldCityRespawnAfterBattle({
      battleType: BattleType.PVE,
      victory: true,
    })).toBe(false);
  });

  it('resolveBattleArenaMode', () => {
    expect(resolveBattleArenaMode(BattleType.PVP)).toBe('pvp');
    expect(resolveBattleArenaMode('PVP')).toBe('pvp');
    expect(resolveBattleArenaMode(BattleType.PVE)).toBe('pve');
  });
});
