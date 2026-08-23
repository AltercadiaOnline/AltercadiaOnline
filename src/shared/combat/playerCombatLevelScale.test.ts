import { describe, expect, it } from 'vitest';
import { CLASS_CATALOG } from '../types/classes.js';
import { ItemBuffType } from '../items/itemTypes.js';
import { calculateDamage } from './calculateDamage.js';
import { resolveClassAttack, resolveClassDefense } from './combatBreakdownBuilder.js';
import { moveIdToSkillData } from './movesetLoadout.js';
import {
  resolvePlayerLevelAttack,
  resolvePlayerLevelDefense,
} from './playerCombatLevelScale.js';
import {
  MOVE_POWER_GROWTH_PER_LEVEL,
  totalMasteryXpForLevel,
} from '../progression/moveProgression.js';
import type { Combatant, CombatStatSources } from '../types/combat.js';

function emptySources(patch: Partial<CombatStatSources> = {}): CombatStatSources {
  return {
    attackRunePercent: 0,
    attackBookPercent: 0,
    attackArmorPercent: 0,
    attackMarcosFlat: 0,
    attackMarcosPercent: 0,
    defenseArmorPercent: 0,
    defenseRunePercent: 0,
    defenseBookPercent: 0,
    defenseMarcosFlat: 0,
    defenseMarcosPercent: 0,
    marcoCritPercent: 0,
    marcoDodgePercent: 0,
    marcoDamageReductionPercent: 0,
    ...patch,
  };
}

describe('playerCombatLevelScale', () => {
  it('nível não escala ATK/DEF — só o baseline da classe', () => {
    expect(resolvePlayerLevelAttack(CLASS_CATALOG.IMPETUS.bonus.attack, 1)).toBe(6);
    expect(resolvePlayerLevelDefense(CLASS_CATALOG.IMPETUS.bonus.defense, 1)).toBe(4);
    expect(resolvePlayerLevelAttack(CLASS_CATALOG.IMPETUS.bonus.attack, 30)).toBe(6);
    expect(resolvePlayerLevelDefense(CLASS_CATALOG.IMPETUS.bonus.defense, 30)).toBe(4);
    expect(resolvePlayerLevelAttack(CLASS_CATALOG.COGITOR.bonus.attack, 60)).toBe(5);
    expect(resolvePlayerLevelDefense(CLASS_CATALOG.COGITOR.bonus.defense, 60)).toBe(5);
  });

  it('nível ausente não infla o stat', () => {
    expect(resolvePlayerLevelAttack(10, undefined)).toBe(10);
    expect(resolvePlayerLevelDefense(10, null)).toBe(10);
  });

  it('domínio do golpe continua sendo o teto de poder do move', () => {
    const attack = resolvePlayerLevelAttack(CLASS_CATALOG.COGITOR.bonus.attack, 60);
    const execucaoBase = 18;
    const movePower = Math.floor(execucaoBase * (1 + MOVE_POWER_GROWTH_PER_LEVEL * 29));
    expect(attack).toBe(5);
    expect(movePower).toBe(44);
  });

  it('resolveClassAttack usa só a classe no PLAYER', () => {
    const player: Combatant = {
      id: 'player',
      name: 'Operative',
      hp: 100,
      maxHp: 100,
      classId: 'IMPETUS',
      level: 30,
      combatRole: 'PLAYER',
      skills: [],
      statusEffects: [],
      activeStatuses: [],
      activeShields: [],
      temporaryModifiers: [],
      lockedSkillIds: [],
    };
    expect(resolveClassAttack(player)).toBe(6);
    expect(resolveClassDefense(player)).toBe(4);

    const rat: Combatant = {
      ...player,
      id: 'enemy_rat',
      combatRole: 'ENEMY',
      baseAttack: 7,
      baseDefense: 3,
      classId: 'DISSOLUTUS',
    };
    expect(resolveClassAttack(rat)).toBe(7);
    expect(resolveClassDefense(rat)).toBe(3);
  });

  it('PLAYER ignora baseAttack 0 — o golpe usa ATK da classe', () => {
    const player: Combatant = {
      id: 'player',
      name: 'Cogitor',
      hp: 100,
      maxHp: 100,
      classId: 'COGITOR',
      level: 60,
      combatRole: 'PLAYER',
      baseAttack: 0,
      skills: [],
      statusEffects: [],
      activeStatuses: [],
      activeShields: [],
      temporaryModifiers: [],
      lockedSkillIds: [],
    };
    expect(resolveClassAttack(player)).toBe(5);
  });

  it('Cogitor 60 + Execução domínio 50: ATK de classe + move + CRIT%', () => {
    const skill = moveIdToSkillData('COG_1', totalMasteryXpForLevel(50));
    const player: Combatant = {
      id: 'player',
      name: 'Cogitor',
      hp: 200,
      maxHp: 200,
      classId: 'COGITOR',
      level: 60,
      combatRole: 'PLAYER',
      skills: [skill],
      combatStatSources: emptySources({
        amuletByBuff: {
          [ItemBuffType.Strength]: 6,
          [ItemBuffType.Critical]: 16,
        },
        allocatedAttackFlat: 20,
      }),
      statusEffects: [],
      activeStatuses: [],
      activeShields: [],
      temporaryModifiers: [],
      lockedSkillIds: [],
    };
    const rat: Combatant = {
      id: 'enemy_bat',
      name: 'Morcego',
      hp: 55,
      maxHp: 55,
      combatRole: 'ENEMY',
      classId: 'DISSOLUTUS',
      baseAttack: 7,
      baseDefense: 3,
      skills: [],
      statusEffects: [],
      activeStatuses: [],
      activeShields: [],
      temporaryModifiers: [],
      lockedSkillIds: [],
    };

    const result = calculateDamage(player, rat, {
      id: 'COG_1',
      power: skill.basePower ?? skill.damage,
    });
    const atkLine = result.attackBreakdown.lines.find((line) => line.source === 'ataque');
    const fichaLine = result.attackBreakdown.lines.find((line) => line.source === 'ficha');
    const moveLine = result.attackBreakdown.lines.find((line) => line.source === 'moveset');
    const critLine = result.attackBreakdown.lines.find(
      (line) => line.buffType === ItemBuffType.Critical && line.includeInTotal !== false,
    );

    expect(atkLine?.value).toBe(5);
    expect(fichaLine?.value).toBe(20);
    expect(moveLine?.value).toBeGreaterThanOrEqual(62);
    expect(critLine?.value).toBeGreaterThan(0);
    expect(result.finalDamage).toBeGreaterThan(80);
    expect(result.finalDamage).not.toBe(32);
  });
});
