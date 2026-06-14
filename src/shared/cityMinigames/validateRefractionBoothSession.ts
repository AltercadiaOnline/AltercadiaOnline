import { REFRACTION_BOOTH_CONFIG } from './refractionBoothConfig.js';
import type { RefractionBoothCompletePayload } from './refractionBoothTypes.js';
import { calculateRefractionBoothScore } from './refractionBoothScore.js';

export type RefractionBoothSessionRecord = {
  readonly sessionId: string;
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly seed: number;
  readonly startedAtMs: number;
  readonly expiresAtMs: number;
  completed: boolean;
};

export type RefractionBoothValidationResult =
  | {
      readonly ok: true;
      readonly hits: number;
      readonly misses: number;
      readonly durationMs: number;
      readonly score: number;
    }
  | { readonly ok: false; readonly reason: string };

function validateHitTimings(
  hitTimings: readonly number[] | undefined,
  hits: number,
  durationMs: number,
): string | null {
  if (hits === 0) {
    if (hitTimings && hitTimings.length > 0) {
      return 'Registro de acertos inconsistente.';
    }
    return null;
  }

  if (!hitTimings || hitTimings.length !== hits) {
    return 'Registro de acertos inconsistente.';
  }

  let previous = -REFRACTION_BOOTH_CONFIG.minHitIntervalMs;
  for (const timing of hitTimings) {
    if (!Number.isFinite(timing) || timing < 0 || timing > durationMs) {
      return 'Intervalo de acerto inválido.';
    }
    if (timing - previous < REFRACTION_BOOTH_CONFIG.minHitIntervalMs) {
      return 'Acertos registrados rápido demais.';
    }
    previous = timing;
  }

  return null;
}

export function validateRefractionBoothComplete(
  session: RefractionBoothSessionRecord | undefined,
  payload: RefractionBoothCompletePayload,
  nowMs: number,
): RefractionBoothValidationResult {
  if (!session) {
    return { ok: false, reason: 'Sessão não encontrada.' };
  }
  if (session.sessionId !== payload.sessionId) {
    return { ok: false, reason: 'Sessão inválida.' };
  }
  if (session.completed) {
    return { ok: false, reason: 'Sessão já finalizada.' };
  }
  if (nowMs > session.expiresAtMs + 5_000) {
    return { ok: false, reason: 'Sessão expirada.' };
  }

  const hits = Math.floor(payload.hits);
  const misses = Math.floor(payload.misses);
  const durationMs = Math.floor(payload.durationMs);

  if (!Number.isFinite(hits) || hits < 0 || hits > REFRACTION_BOOTH_CONFIG.maxHits) {
    return { ok: false, reason: 'Contagem de acertos inválida.' };
  }
  if (!Number.isFinite(misses) || misses < 0) {
    return { ok: false, reason: 'Contagem de erros inválida.' };
  }

  const maxHitsByDuration = Math.min(
    REFRACTION_BOOTH_CONFIG.maxHits,
    Math.floor(durationMs / REFRACTION_BOOTH_CONFIG.minHitIntervalMs) + 1,
  );
  if (hits > maxHitsByDuration) {
    return { ok: false, reason: 'Quantidade de acertos impossível.' };
  }

  if (!Number.isFinite(durationMs)) {
    return { ok: false, reason: 'Sessão curta demais.' };
  }

  const minDurationMs =
    misses >= REFRACTION_BOOTH_CONFIG.maxMisses
      ? REFRACTION_BOOTH_CONFIG.earlyFailMinDurationMs
      : REFRACTION_BOOTH_CONFIG.minSessionDurationMs;

  if (durationMs < minDurationMs) {
    return { ok: false, reason: 'Sessão curta demais.' };
  }
  if (durationMs > REFRACTION_BOOTH_CONFIG.sessionDurationMs + 5_000) {
    return { ok: false, reason: 'Sessão longa demais.' };
  }

  const timingError = validateHitTimings(payload.hitTimings, hits, durationMs);
  if (timingError) {
    return { ok: false, reason: timingError };
  }

  const score = calculateRefractionBoothScore(hits, misses);
  return { ok: true, hits, misses, durationMs, score };
}
