import type { GridCell } from './battleGridConstants.js';
import type { ActionRequest } from '../types/combat.js';

export type { ActionRequest, ResolvedCombatAction } from '../types/combat.js';

const ALLOWED_COMBAT_ACTION_INTENT_KEYS = new Set<string>([
  'battleId',
  'actorId',
  'turn',
  'skillId',
  'requestId',
  'consumableId',
  'targetTile',
  'targetId',
]);

/** Campos historicamente usados em tentativas de injeção — sinalizados nos logs. */
const KNOWN_INJECTION_KEYS = new Set<string>([
  'consumableHeal',
  'runeCritBonus',
  'runeReflectRatio',
  'priorityHint',
  'damage',
  'isCritical',
  'healAmount',
  'skillPriority',
]);

function findRejectedCombatActionIntentKeys(raw: Record<string, unknown>): readonly string[] {
  return Object.keys(raw).filter((key) => !ALLOWED_COMBAT_ACTION_INTENT_KEYS.has(key));
}

function warnRejectedCombatActionIntentFields(
  raw: Record<string, unknown>,
  rejectedKeys: readonly string[],
): void {
  if (rejectedKeys.length === 0) return;

  const injectionHits = rejectedKeys.filter((key) => KNOWN_INJECTION_KEYS.has(key));
  console.warn('[combat-intent-sanitize] Campos não permitidos ignorados', {
    rejectedKeys,
    ...(injectionHits.length > 0 ? { injectionHits } : {}),
    battleId: typeof raw.battleId === 'string' ? raw.battleId : undefined,
    actorId: typeof raw.actorId === 'string' ? raw.actorId : undefined,
    requestId: typeof raw.requestId === 'string' ? raw.requestId : undefined,
  });
}

export type SanitizeCombatActionIntentOptions = {
  /** Default true — desligue na segunda passagem (ex.: CombatSession após wsProtocol). */
  readonly logRejectedFields?: boolean;
};

/**
 * Extrai somente o DTO mínimo de intenção — ignora propriedades extras (anti-injeção).
 * Retorna null se campos obrigatórios forem inválidos.
 */
export function sanitizeCombatActionIntent(
  value: unknown,
  options?: SanitizeCombatActionIntentOptions,
): ActionRequest | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  const rejectedKeys = findRejectedCombatActionIntentKeys(raw);
  if (options?.logRejectedFields !== false) {
    warnRejectedCombatActionIntentFields(raw, rejectedKeys);
  }

  if (typeof raw.battleId !== 'string' || raw.battleId.length === 0) return null;
  if (typeof raw.actorId !== 'string' || raw.actorId.length === 0) return null;
  if (typeof raw.turn !== 'number' || !Number.isFinite(raw.turn)) return null;
  if (!Number.isInteger(raw.turn) || raw.turn < 0) return null;
  if (raw.skillId !== null && typeof raw.skillId !== 'string') return null;
  if (typeof raw.requestId !== 'string' || raw.requestId.length === 0) return null;
  if (raw.requestId.length > 128) return null;

  if (
    raw.consumableId !== undefined
    && raw.consumableId !== null
    && typeof raw.consumableId !== 'string'
  ) {
    return null;
  }

  if (raw.targetId !== undefined && typeof raw.targetId !== 'string') return null;

  let targetTile: GridCell | undefined;
  if (raw.targetTile !== undefined) {
    if (typeof raw.targetTile !== 'object' || raw.targetTile === null) return null;
    const tile = raw.targetTile as Record<string, unknown>;
    if (!Number.isInteger(tile.x) || !Number.isInteger(tile.y)) return null;
    targetTile = { x: tile.x as number, y: tile.y as number };
  }

  return {
    battleId: raw.battleId,
    actorId: raw.actorId,
    turn: raw.turn,
    skillId: raw.skillId as string | null,
    requestId: raw.requestId,
    ...(raw.consumableId !== undefined ? { consumableId: raw.consumableId as string | null } : {}),
    ...(raw.targetId !== undefined ? { targetId: raw.targetId as string } : {}),
    ...(targetTile !== undefined ? { targetTile } : {}),
  };
}

export function isCombatActionIntent(value: unknown): value is ActionRequest {
  return sanitizeCombatActionIntent(value) !== null;
}
