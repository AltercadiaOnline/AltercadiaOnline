import { resolveClassAgility } from './resolveClassAgility.js';
import { resolveCombatantGearBuffs } from './itemBuffCombat.js';
import type { Combatant } from '../types/combat.js';

/**
 * Agilidade de combate — tempo, não playback.
 *
 * SET AGI / classe **não** aceleram animação (`combatSequenceConstants`).
 * Entram só em:
 * 1) viés na ordem do lote (mesmo prioridade de move) — nunca 100%;
 * 2) chance ocasional de golpe extra sem reação inimiga (PvE), com cooldown.
 *
 * Full AGI não garante o 1º slot entre 6: o sorteio por ator é transitivo
 * (`tempoKey`) e o peso aleatório permanece maior que o da pontuação.
 */

export const AGILITY_TEMPO_RANDOM_WEIGHT = 0.7;
export const AGILITY_TEMPO_SCORE_WEIGHT = 0.3;
export const AGILITY_OPENING_RANDOM_WEIGHT = 0.58;
export const AGILITY_OPENING_SCORE_WEIGHT = 0.42;

export const AGILITY_EXTRA_MIN_TURN = 3;
export const AGILITY_EXTRA_COOLDOWN_TURNS = 3;
export const AGILITY_EXTRA_CHANCE_FLOOR = 0.05;
export const AGILITY_EXTRA_CHANCE_CEIL = 0.22;

export const AGILITY_EXTRA_GRANT_LOG =
  'Agilidade — o próximo golpe sai antes do oponente.';
export const AGILITY_EXTRA_STRIKE_LOG = 'Agilidade — golpe extra!';

export function isAgilityTempoLogLine(line: string | undefined | null): boolean {
  if (!line) return false;
  return line.startsWith('Agilidade —');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Hash FNV-1a → [0, 1). Determinístico no servidor. */
export function agilityHash01(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x1_0000_0000;
}

/** Classe + AGI% do SET como pontos de tempo (HUD +12 AGI → +12 tempo). */
export function computeAgilityTempoScore(input: {
  readonly classAgility: number;
  readonly agilityPercent: number;
}): number {
  return Math.max(0, input.classAgility) + Math.max(0, input.agilityPercent);
}

export function agilityTempoScoreFromCombatant(actor: Combatant): number {
  const explicit = actor.speedProfile?.classAgility ?? actor.speedProfile?.classSpeedBias;
  const classAgility = explicit !== undefined ? explicit : resolveClassAgility(actor.classId);
  const gear = resolveCombatantGearBuffs(actor);
  return computeAgilityTempoScore({
    classAgility,
    agilityPercent: gear.agilityPercent,
  });
}

export function formatTurnOrderNarrative(
  order: readonly string[],
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string | null,
): string | null {
  if (order.length < 2) return null;
  const names = order.map((id) => {
    if (playerActorId && id === playerActorId) return 'Você';
    return combatants[id]?.name ?? id;
  });
  return `Quem age: ${names.join(' → ')}`;
}

/** Diminishing: 0→0, 12→0.37, 40→0.67 — nunca satura em 1. */
export function normalizeAgilityTempoScore(score: number): number {
  const n = Math.max(0, score);
  return n / (n + 20);
}

export function computeAgilityTempoKey(input: {
  readonly battleId: string;
  readonly turn: number;
  readonly actorId: string;
  readonly agilityScore: number;
  readonly isOpening: boolean;
}): number {
  const hash = agilityHash01(`${input.battleId}:${input.turn}:${input.actorId}:tempo`);
  const scoreN = normalizeAgilityTempoScore(input.agilityScore);
  const randomW = input.isOpening ? AGILITY_OPENING_RANDOM_WEIGHT : AGILITY_TEMPO_RANDOM_WEIGHT;
  const scoreW = input.isOpening ? AGILITY_OPENING_SCORE_WEIGHT : AGILITY_TEMPO_SCORE_WEIGHT;
  return hash * randomW + scoreN * scoreW;
}

export function agilityExtraActionChance(playerScore: number, foeMaxScore: number): number {
  const lead = playerScore - foeMaxScore;
  if (lead <= 0) return 0;
  const curve = Math.tanh(lead / 18);
  return clamp(0.06 + curve * 0.16, AGILITY_EXTRA_CHANCE_FLOOR, AGILITY_EXTRA_CHANCE_CEIL);
}

export function shouldGrantAgilityExtraAction(input: {
  readonly battleId: string;
  readonly turn: number;
  readonly playerScore: number;
  readonly foeMaxScore: number;
  readonly lastExtraTurn: number | null;
  readonly alreadySkipping: boolean;
}): boolean {
  if (input.alreadySkipping) return false;
  if (input.turn < AGILITY_EXTRA_MIN_TURN) return false;
  if (
    input.lastExtraTurn != null
    && input.turn - input.lastExtraTurn < AGILITY_EXTRA_COOLDOWN_TURNS
  ) {
    return false;
  }
  const chance = agilityExtraActionChance(input.playerScore, input.foeMaxScore);
  if (chance <= 0) return false;
  return agilityHash01(`${input.battleId}:${input.turn}:agi-extra`) < chance;
}
