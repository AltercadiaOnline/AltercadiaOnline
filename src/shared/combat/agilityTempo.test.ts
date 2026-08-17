import { describe, expect, it } from 'vitest';
import {
  AGILITY_EXTRA_CHANCE_CEIL,
  AGILITY_EXTRA_COOLDOWN_TURNS,
  AGILITY_EXTRA_MIN_TURN,
  AGILITY_EXTRA_STRIKE_LOG,
  agilityExtraActionChance,
  computeAgilityTempoKey,
  computeAgilityTempoScore,
  formatTurnOrderNarrative,
  isAgilityTempoLogLine,
  normalizeAgilityTempoScore,
  shouldGrantAgilityExtraAction,
} from './agilityTempo.js';
import { compareInitiativeEntries } from './initiativeFormula.js';
import type { Combatant } from '../types/combat.js';

describe('agilityTempo', () => {
  it('soma classe + AGI% do SET como pontos, não como velocidade de animação', () => {
    expect(computeAgilityTempoScore({ classAgility: 5, agilityPercent: 12 })).toBe(17);
    expect(normalizeAgilityTempoScore(12)).toBeCloseTo(12 / 32, 5);
    expect(normalizeAgilityTempoScore(40)).toBeLessThan(0.7);
  });

  it('full AGI não ganha sempre o primeiro golpe do lote (abertura)', () => {
    const fast = computeAgilityTempoScore({ classAgility: 5, agilityPercent: 40 });
    const slow = computeAgilityTempoScore({ classAgility: 2, agilityPercent: 0 });
    let fastFirst = 0;
    const samples = 80;
    for (let i = 0; i < samples; i += 1) {
      const battleId = `battle-${i}`;
      const a = compareInitiativeEntries(
        {
          skillPriority: 1,
          movesetPriorityScore: 1,
          effectiveSpeedRaw: 40,
          speedAttributeContribution: 14,
          initiativeScore: 114,
          tieBreakerSeed: 1,
          agilityTempoKey: computeAgilityTempoKey({
            battleId,
            turn: 1,
            actorId: 'player',
            agilityScore: fast,
            isOpening: true,
          }),
        },
        {
          skillPriority: 1,
          movesetPriorityScore: 1,
          effectiveSpeedRaw: 37,
          speedAttributeContribution: 13,
          initiativeScore: 113,
          tieBreakerSeed: 2,
          agilityTempoKey: computeAgilityTempoKey({
            battleId,
            turn: 1,
            actorId: 'enemy',
            agilityScore: slow,
            isOpening: true,
          }),
        },
      );
      if (a < 0) fastFirst += 1;
    }
    expect(fastFirst).toBeGreaterThan(samples * 0.45);
    expect(fastFirst).toBeLessThan(samples);
  });

  it('prioridade do move continua acima do tempo de agilidade', () => {
    const cmp = compareInitiativeEntries(
      {
        skillPriority: 3,
        movesetPriorityScore: 3,
        effectiveSpeedRaw: 0,
        speedAttributeContribution: 0,
        initiativeScore: 300,
        tieBreakerSeed: 9,
        agilityTempoKey: 0.1,
      },
      {
        skillPriority: 1,
        movesetPriorityScore: 1,
        effectiveSpeedRaw: 99,
        speedAttributeContribution: 99,
        initiativeScore: 199,
        tieBreakerSeed: 1,
        agilityTempoKey: 0.99,
      },
    );
    expect(cmp).toBeLessThan(0);
  });

  it('golpe extra: sem liderança = 0; teto mesmo com lead enorme', () => {
    expect(agilityExtraActionChance(5, 8)).toBe(0);
    expect(agilityExtraActionChance(8, 8)).toBe(0);
    expect(agilityExtraActionChance(80, 0)).toBeLessThanOrEqual(AGILITY_EXTRA_CHANCE_CEIL);
    expect(agilityExtraActionChance(17, 2)).toBeGreaterThan(0.08);
    expect(agilityExtraActionChance(17, 2)).toBeLessThan(0.2);
  });

  it('golpe extra respeita turno mínimo e cooldown', () => {
    const base = {
      battleId: 'b-extra',
      playerScore: 40,
      foeMaxScore: 2,
      alreadySkipping: false,
    };
    expect(shouldGrantAgilityExtraAction({
      ...base,
      turn: AGILITY_EXTRA_MIN_TURN - 1,
      lastExtraTurn: null,
    })).toBe(false);

    expect(shouldGrantAgilityExtraAction({
      ...base,
      turn: 8,
      lastExtraTurn: 8 - (AGILITY_EXTRA_COOLDOWN_TURNS - 1),
    })).toBe(false);

    expect(shouldGrantAgilityExtraAction({
      ...base,
      turn: 8,
      lastExtraTurn: null,
      alreadySkipping: true,
    })).toBe(false);
  });

  it('narra ordem do servidor sem calcular iniciativa no cliente', () => {
    const line = formatTurnOrderNarrative(
      ['player', 'enemy_rat'],
      {
        player: stubNamed('player', 'Operative'),
        enemy_rat: stubNamed('enemy_rat', 'Rato'),
      },
      'player',
    );
    expect(line).toBe('Quem age: Você → Rato');
    expect(formatTurnOrderNarrative(['player'], {}, 'player')).toBeNull();
  });

  it('identifica log de tempo de AGI para playback instantâneo', () => {
    expect(isAgilityTempoLogLine(AGILITY_EXTRA_STRIKE_LOG)).toBe(true);
    expect(isAgilityTempoLogLine('↳ Golpe 23 − Defesa 3 → 20')).toBe(false);
  });
});

function stubNamed(id: string, name: string): Combatant {
  return {
    id,
    name,
    hp: 10,
    maxHp: 10,
    skills: [],
    statusEffects: [],
    activeStatuses: [],
    activeShields: [],
    temporaryModifiers: [],
    lockedSkillIds: [],
  };
}
