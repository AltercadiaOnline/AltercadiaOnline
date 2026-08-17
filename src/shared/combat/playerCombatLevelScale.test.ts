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
  it('nível 1 = baseline da classe', () => {
    expect(resolvePlayerLevelAttack(CLASS_CATALOG.IMPETUS.bonus.attack, 1)).toBe(10);
    expect(resolvePlayerLevelDefense(CLASS_CATALOG.IMPETUS.bonus.defense, 1)).toBe(2);
  });

  it('nível 30 Impetus: ATK 30 / DEF 11 — piso mais grosso', () => {
    expect(resolvePlayerLevelAttack(10, 30)).toBe(30);
    expect(resolvePlayerLevelDefense(2, 30)).toBe(11);
  });

  it('Cogitor 60 não fica preso no ATK 3 da classe — o extra usa piso 8', () => {
    expect(resolvePlayerLevelAttack(CLASS_CATALOG.COGITOR.bonus.attack, 60)).toBe(36);
    expect(resolvePlayerLevelDefense(CLASS_CATALOG.COGITOR.bonus.defense, 60)).toBe(21);
  });

  it('nível ausente não infla o stat', () => {
    expect(resolvePlayerLevelAttack(10, undefined)).toBe(10);
    expect(resolvePlayerLevelDefense(10, null)).toBe(10);
  });

  it('nível 60 + domínio 30 da Execução ≈ golpe 80 (ATK 36 + move 44)', () => {
    const attack = resolvePlayerLevelAttack(CLASS_CATALOG.COGITOR.bonus.attack, 60);
    const execucaoBase = 18;
    const movePower = Math.floor(execucaoBase * (1 + MOVE_POWER_GROWTH_PER_LEVEL * 29));
    expect(attack).toBe(36);
    expect(movePower).toBe(44);
    expect(attack + movePower).toBe(80);
  });

  it('resolveClassAttack aplica o nível só em PLAYER', () => {
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
    expect(resolveClassAttack(player)).toBe(30);
    expect(resolveClassDefense(player)).toBe(11);

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

  it('PLAYER ignora baseAttack 0 — o golpe usa ATK de nível', () => {
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
    expect(resolveClassAttack(player)).toBe(36);
  });

  it('Cogitor 60 + Execução domínio 50 não fecha em 32 — ATK, move e CRIT% entram', () => {
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
    const moveLine = result.attackBreakdown.lines.find((line) => line.source === 'moveset');
    const critLine = result.attackBreakdown.lines.find(
      (line) => line.buffType === ItemBuffType.Critical && line.includeInTotal !== false,
    );

    expect(atkLine?.value).toBe(36);
    expect(moveLine?.value).toBeGreaterThanOrEqual(62);
    expect(critLine?.value).toBeGreaterThan(0);
    expect(result.finalDamage).toBeGreaterThan(90);
    expect(result.finalDamage).not.toBe(32);
  });
});
