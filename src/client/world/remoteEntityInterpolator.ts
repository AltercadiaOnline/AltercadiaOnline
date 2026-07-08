import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { RemotePlayerSnapshot } from '../../shared/world/remotePlayerSync.js';

/** Atraso de renderização — suaviza jitter de rede sem predição no cliente. */
export const REMOTE_ENTITY_RENDER_DELAY_MS = 100;

/** Janela máxima de histórico por entidade remota. */
export const REMOTE_ENTITY_BUFFER_MS = 500;

const MAX_SNAPSHOTS_PER_ENTITY = 16;

export type RemoteEntityKeyframe = {
  readonly entityId: string;
  readonly feetX: number;
  readonly feetY: number;
  readonly facing: PlayerFacing;
  readonly serverTimeMs: number;
};

export type RemoteEntityDisplayState = {
  readonly entityId: string;
  readonly feetX: number;
  readonly feetY: number;
  readonly facing: PlayerFacing;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function remotePlayerSnapshotToKeyframe(snapshot: RemotePlayerSnapshot): RemoteEntityKeyframe {
  return {
    entityId: snapshot.playerId,
    feetX: snapshot.feetX,
    feetY: snapshot.feetY,
    facing: snapshot.facing,
    serverTimeMs: snapshot.serverTimeMs,
  };
}

/**
 * Buffer de snapshots por entidade — interpolação linear entre ticks (sem predição).
 * Remotos nunca usam input local; só suavizam posição autoritativa do servidor.
 */
export class RemoteEntityInterpolator {
  private readonly buffers = new Map<string, RemoteEntityKeyframe[]>();

  pushKeyframe(keyframe: RemoteEntityKeyframe): void {
    const entityId = keyframe.entityId;
    const buffer = this.buffers.get(entityId) ?? [];
    const last = buffer[buffer.length - 1];

    if (last && keyframe.serverTimeMs < last.serverTimeMs) {
      return;
    }

    if (last && keyframe.serverTimeMs === last.serverTimeMs) {
      buffer[buffer.length - 1] = keyframe;
    } else {
      buffer.push(keyframe);
    }

    while (buffer.length > MAX_SNAPSHOTS_PER_ENTITY) {
      buffer.shift();
    }

    this.buffers.set(entityId, buffer);
  }

  pushRemotePlayerSnapshot(snapshot: RemotePlayerSnapshot): void {
    this.pushKeyframe(remotePlayerSnapshotToKeyframe(snapshot));
  }

  sample(entityId: string, nowMs: number): RemoteEntityDisplayState | null {
    const buffer = this.buffers.get(entityId);
    if (!buffer || buffer.length === 0) return null;

    const renderTime = nowMs - REMOTE_ENTITY_RENDER_DELAY_MS;
    const first = buffer[0]!;
    const last = buffer[buffer.length - 1]!;

    if (renderTime <= first.serverTimeMs) {
      return {
        entityId,
        feetX: first.feetX,
        feetY: first.feetY,
        facing: first.facing,
      };
    }

    if (renderTime >= last.serverTimeMs) {
      return {
        entityId,
        feetX: last.feetX,
        feetY: last.feetY,
        facing: last.facing,
      };
    }

    for (let index = 0; index < buffer.length - 1; index += 1) {
      const before = buffer[index]!;
      const after = buffer[index + 1]!;
      if (before.serverTimeMs > renderTime || after.serverTimeMs < renderTime) {
        continue;
      }

      const span = after.serverTimeMs - before.serverTimeMs;
      const t = span > 0 ? clamp01((renderTime - before.serverTimeMs) / span) : 1;
      return {
        entityId,
        feetX: lerp(before.feetX, after.feetX, t),
        feetY: lerp(before.feetY, after.feetY, t),
        facing: after.facing,
      };
    }

    return {
      entityId,
      feetX: last.feetX,
      feetY: last.feetY,
      facing: last.facing,
    };
  }

  listEntityIds(): string[] {
    return [...this.buffers.keys()];
  }

  prune(nowMs: number, maxAgeMs: number = REMOTE_ENTITY_BUFFER_MS): void {
    const cutoff = nowMs - maxAgeMs;
    for (const [entityId, buffer] of this.buffers) {
      const trimmed = buffer.filter((entry) => entry.serverTimeMs >= cutoff);
      if (trimmed.length === 0) {
        this.buffers.delete(entityId);
      } else {
        this.buffers.set(entityId, trimmed);
      }
    }
  }

  removeEntity(entityId: string): void {
    this.buffers.delete(entityId);
  }

  clear(): void {
    this.buffers.clear();
  }
}
