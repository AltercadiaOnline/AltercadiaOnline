import { describe, expect, it } from 'vitest';
import {
  resolveCharacterLevelBattleTarget,
  resolveCharacterRequiredXp,
  resolveTypicalCharacterLevelXpPerBattle,
} from './characterXpCurve.js';

function fightsFor(level: number): number {
  return resolveCharacterRequiredXp(level) / resolveTypicalCharacterLevelXpPerBattle(level);
}

describe('characterXpCurve', () => {
  it('early game: 1→2 ≈ 2 lutas, 2→3 ≈ 4 lutas', () => {
    expect(fightsFor(1)).toBeCloseTo(2, 5);
    expect(fightsFor(2)).toBeCloseTo(4, 5);
  });

  it('âncoras de endgame em lutas na zona natural', () => {
    expect(fightsFor(50)).toBeCloseTo(35, 0);
    expect(fightsFor(51)).toBeCloseTo(38, 0);
    expect(fightsFor(70)).toBeCloseTo(80, 0);
    expect(fightsFor(80)).toBeCloseTo(90, 0);
    expect(fightsFor(90)).toBeCloseTo(120, 0);
    expect(fightsFor(100)).toBeCloseTo(150, 0);
  });

  it('Zona 1 inteira paga o mesmo XP; voltar lá no 70 é ineficiente', () => {
    const zone1Xp = resolveTypicalCharacterLevelXpPerBattle(1);
    expect(resolveTypicalCharacterLevelXpPerBattle(9)).toBe(zone1Xp);

    const zone5Xp = resolveTypicalCharacterLevelXpPerBattle(70);
    expect(zone5Xp).toBeGreaterThan(zone1Xp);

    const fightsIfStayInNaturalZone = fightsFor(70);
    const fightsIfFarmZone1 = resolveCharacterRequiredXp(70) / zone1Xp;
    expect(fightsIfFarmZone1).toBeGreaterThan(fightsIfStayInNaturalZone);
  });

  it('não tem teto: depois do 100 continua mais difícil e monotônico', () => {
    expect(fightsFor(110)).toBeGreaterThan(fightsFor(100));
    expect(fightsFor(120)).toBeGreaterThan(fightsFor(110));
    expect(resolveCharacterRequiredXp(200)).toBeGreaterThan(resolveCharacterRequiredXp(100));

    let prevBattles = resolveCharacterLevelBattleTarget(1);
    let prevXp = resolveCharacterRequiredXp(1);
    for (let level = 2; level <= 130; level += 1) {
      const battles = resolveCharacterLevelBattleTarget(level);
      const xp = resolveCharacterRequiredXp(level);
      expect(battles).toBeGreaterThanOrEqual(prevBattles);
      expect(xp).toBeGreaterThan(prevXp);
      prevBattles = battles;
      prevXp = xp;
    }
  });
});
