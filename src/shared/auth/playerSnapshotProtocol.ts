import type { AuthoritativePlayerSnapshot } from '../playerDataSnapshots.js';

/** Resposta autoritativa de GET /api/player-snapshot — UI só libera com `ready: true`. */
export type AuthoritativePlayerSnapshotResponse = {
  readonly ready: true;
  readonly snapshot: AuthoritativePlayerSnapshot;
};

export type PlayerSnapshotNotReadyResponse = {
  readonly ready: false;
  readonly error: string;
  readonly retryable: true;
};

export function isAuthoritativePlayerSnapshotResponse(
  value: unknown,
): value is AuthoritativePlayerSnapshotResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.ready === true
    && record.snapshot !== undefined
    && typeof record.snapshot === 'object'
  );
}

export function isPlayerSnapshotNotReadyResponse(
  value: unknown,
): value is PlayerSnapshotNotReadyResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.ready === false && record.retryable === true;
}
