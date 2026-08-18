import { describe, expect, it } from 'vitest';
import {
  buildPveEnemyActorId,
  capPveEncounterPackSizeForPlayerLevel,
  clampPveEncounterPackSize,
  countDefeatedPveEnemies,
  formatPvePackStaggerLog,
  pvePackMemberReadyOnCycle,
  resolvePveEnemyPackIndex,
  resolvePveLootSpinCount,
  rollPveEncounterPackSize,
  stripPveEnemyPackSuffix,
} from './pveEncounterPack.js';
import { resolveBattleXpGain } from './battleXpRewards.js';
import { resolveBattleProgressionGrant } from '../progression/battleProgressionGrant.js';
import { BattleType } from './battleType.js';

describe('rollPveEncounterPackSize', () => {
  it('1 monstro em 70%, 2 em 20%, 3 em 10%', () => {
    expect(rollPveEncounterPackSize(() => 0)).toBe(1);
    expect(rollPveEncounterPackSize(() => 0.699)).toBe(1);
    expect(rollPveEncounterPackSize(() => 0.70)).toBe(2);
    expect(rollPveEncounterPackSize(() => 0.899)).toBe(2);
    expect(rollPveEncounterPackSize(() => 0.90)).toBe(3);
    expect(rollPveEncounterPackSize(() => 0.999)).toBe(3);
  });

  it('actorId de bando mapeia de volta ao creatureId', () => {
    expect(buildPveEnemyActorId('rat', 0)).toBe('enemy_rat');
    expect(buildPveEnemyActorId('rat', 2)).toBe('enemy_rat__2');
    expect(stripPveEnemyPackSuffix('rat__2')).toBe('rat');
    expect(clampPveEncounterPackSize(99)).toBe(3);
    expect(resolvePveEnemyPackIndex('enemy_rat')).toBe(0);
    expect(resolvePveEnemyPackIndex('enemy_rat__2')).toBe(2);
  });
});

describe('capPveEncounterPackSizeForPlayerLevel', () => {
  it('nv 1–3 só solo, 4–6 sem trio, 7+ curva cheia', () => {
    expect(capPveEncounterPackSizeForPlayerLevel(3, 1)).toBe(1);
    expect(capPveEncounterPackSizeForPlayerLevel(3, 3)).toBe(1);
    expect(capPveEncounterPackSizeForPlayerLevel(3, 4)).toBe(2);
    expect(capPveEncounterPackSizeForPlayerLevel(2, 5)).toBe(2);
    expect(capPveEncounterPackSizeForPlayerLevel(3, 7)).toBe(3);
  });
});

describe('pvePackMemberReadyOnCycle', () => {
  it('1º age já; 2º no ciclo 1; 3º no ciclo 2', () => {
    expect(pvePackMemberReadyOnCycle(0, 0)).toBe(true);
    expect(pvePackMemberReadyOnCycle(1, 0)).toBe(false);
    expect(pvePackMemberReadyOnCycle(2, 0)).toBe(false);
    expect(pvePackMemberReadyOnCycle(1, 1)).toBe(true);
    expect(pvePackMemberReadyOnCycle(2, 1)).toBe(false);
    expect(pvePackMemberReadyOnCycle(2, 2)).toBe(true);
    expect(formatPvePackStaggerLog('Rato Dimensional')).toBe(
      'Rato Dimensional ainda se posiciona no bando.',
    );
  });
});

describe('giros da roleta = monstros enfrentados', () => {
  it('resolvePveLootSpinCount usa o hint do bando', () => {
    expect(resolvePveLootSpinCount({}, 2)).toBe(2);
    expect(resolvePveLootSpinCount({}, 3)).toBe(3);
    expect(resolvePveLootSpinCount({
      e0: { id: 'e0', name: 'R', hp: 8, maxHp: 8, skills: [], combatRole: 'ENEMY' },
      e1: { id: 'e1', name: 'R', hp: 8, maxHp: 8, skills: [], combatRole: 'ENEMY' },
    })).toBe(2);
  });
});

describe('XP proporcional ao bando derrotado', () => {
  it('3 ratos somam 3× o pool da zona', () => {
    const one = resolveBattleXpGain('rat');
    const grant = resolveBattleProgressionGrant({
      victory: true,
      battleType: BattleType.PVE,
      creatureId: 'rat',
      defeatedEnemyCount: 3,
    });
    expect(grant.totalBattleXp).toBe(one * 3);
    expect(grant.levelXp).toBeGreaterThan(0);
  });

  it('vitória sem criatura não concede XP', () => {
    const grant = resolveBattleProgressionGrant({
      victory: true,
      battleType: BattleType.PVE,
      defeatedEnemyCount: 3,
    });
    expect(grant.totalBattleXp).toBe(0);
  });
});

describe('countDefeatedPveEnemies', () => {
  it('conta só ENEMY com HP 0', () => {
    expect(countDefeatedPveEnemies({
      p1: { id: 'p1', name: 'P', hp: 10, maxHp: 10, skills: [], combatRole: 'PLAYER' },
      e0: { id: 'e0', name: 'R', hp: 0, maxHp: 8, skills: [], combatRole: 'ENEMY' },
      e1: { id: 'e1', name: 'R', hp: 4, maxHp: 8, skills: [], combatRole: 'ENEMY' },
    })).toBe(1);
  });
});
