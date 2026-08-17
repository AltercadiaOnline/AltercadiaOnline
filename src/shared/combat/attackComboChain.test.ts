import { describe, expect, it } from 'vitest';
import { MoveEffectKind } from './classMovesetCatalog.js';
import { MoveCategory } from './moveTypes.js';
import {
  ATTACK_COMBO_SECOND_MULTIPLIER,
  ATTACK_COMBO_THIRD_MULTIPLIER,
  ATTACK_MASH_SECOND_MULTIPLIER,
  ATTACK_MASH_THIRD_MULTIPLIER,
  advanceAttackComboChain,
  isComboAttackSkill,
} from './attackComboChain.js';

describe('attackComboChain', () => {
  it('cura e defesa não entram na cadeia', () => {
    expect(isComboAttackSkill({
      id: 'IMP_3',
      category: MoveCategory.Support,
      effectKind: MoveEffectKind.Heal,
      basePower: 10,
    })).toBe(false);
    expect(isComboAttackSkill({
      id: 'TUT_2',
      category: MoveCategory.Defense,
      effectKind: MoveEffectKind.SelfShield,
    })).toBe(false);
  });

  it('setup de ataque (eco) conta mesmo sem dano na hora', () => {
    expect(isComboAttackSkill({
      id: 'IMP_2',
      category: MoveCategory.Attack,
      effectKind: MoveEffectKind.AttackEcho,
      basePower: 0,
    })).toBe(true);
  });

  it('mesmo move no mesmo alvo: 2ª −15%; 3ª+ −28%; alvo novo reseta', () => {
    const first = advanceAttackComboChain(null, {
      moveId: 'IMP_1',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    expect(first.multiplier).toBe(1);

    const secondMash = advanceAttackComboChain(first.state, {
      moveId: 'IMP_1',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    expect(secondMash.multiplier).toBe(ATTACK_MASH_SECOND_MULTIPLIER);

    const thirdMash = advanceAttackComboChain(secondMash.state, {
      moveId: 'IMP_1',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    expect(thirdMash.multiplier).toBe(ATTACK_MASH_THIRD_MULTIPLIER);

    const fourthMash = advanceAttackComboChain(thirdMash.state, {
      moveId: 'IMP_1',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    expect(fourthMash.multiplier).toBe(ATTACK_MASH_THIRD_MULTIPLIER);

    const swappedTarget = advanceAttackComboChain(fourthMash.state, {
      moveId: 'IMP_1',
      targetId: 'enemy_dog',
      countsAsComboAttack: true,
    });
    expect(swappedTarget.multiplier).toBe(1);
  });

  it('2º distinto +18%; 3º +32%; mash depois da cadeia quebra o combo', () => {
    const first = advanceAttackComboChain(null, {
      moveId: 'IMP_1',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    expect(first.multiplier).toBe(1);

    const second = advanceAttackComboChain(first.state, {
      moveId: 'IMP_4',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    expect(second.multiplier).toBe(ATTACK_COMBO_SECOND_MULTIPLIER);

    const third = advanceAttackComboChain(second.state, {
      moveId: 'IMP_6',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    expect(third.multiplier).toBe(ATTACK_COMBO_THIRD_MULTIPLIER);

    const mashAfterCombo = advanceAttackComboChain(third.state, {
      moveId: 'IMP_6',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    expect(mashAfterCombo.multiplier).toBe(ATTACK_MASH_SECOND_MULTIPLIER);
  });

  it('trocar de move depois do mash inicia o combo distinto', () => {
    const first = advanceAttackComboChain(null, {
      moveId: 'IMP_1',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    const mash = advanceAttackComboChain(first.state, {
      moveId: 'IMP_1',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    const swapped = advanceAttackComboChain(mash.state, {
      moveId: 'IMP_4',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    expect(swapped.multiplier).toBe(ATTACK_COMBO_SECOND_MULTIPLIER);
  });

  it('cura zera mash e combo', () => {
    const first = advanceAttackComboChain(null, {
      moveId: 'IMP_1',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    const mash = advanceAttackComboChain(first.state, {
      moveId: 'IMP_1',
      targetId: 'enemy_rat',
      countsAsComboAttack: true,
    });
    const healBreaks = advanceAttackComboChain(mash.state, {
      moveId: 'IMP_3',
      targetId: 'player',
      countsAsComboAttack: false,
    });
    expect(healBreaks.state).toBeNull();
    expect(healBreaks.multiplier).toBe(1);
  });
});
