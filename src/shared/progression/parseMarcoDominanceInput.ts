import type { MarcoNodeProgressSnapshot, MarcosNodeProgressionData } from './marcoProgression.js';
import type { MarcoDominanceInput } from './estiloPersonagem.js';

function parseNodeProgression(raw: unknown): MarcosNodeProgressionData | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const byNodeIdRaw = (raw as Record<string, unknown>).byNodeId;
  if (typeof byNodeIdRaw !== 'object' || byNodeIdRaw === null) return null;

  const byNodeId: Record<string, MarcoNodeProgressSnapshot> = {};

  for (const [nodeId, snap] of Object.entries(byNodeIdRaw)) {
    if (typeof snap !== 'object' || snap === null) continue;
    const entry = snap as Record<string, unknown>;
    if (typeof entry.level !== 'number') continue;

    byNodeId[nodeId] = {
      nodeId,
      level: Math.max(1, Math.floor(entry.level)),
      xp: typeof entry.xp === 'number' ? Math.max(0, Math.floor(entry.xp)) : 0,
      nextLevelThreshold:
        typeof entry.nextLevelThreshold === 'number'
          ? Math.max(0, Math.floor(entry.nextLevelThreshold))
          : 0,
    };
  }

  return { byNodeId };
}

/** Valida snapshot Marcos enviado pelo cliente no combat-join. */
export function parseMarcoDominanceInput(raw: unknown): MarcoDominanceInput | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;

  const payload = raw as Record<string, unknown>;
  if (!Array.isArray(payload.activeMarcos)) return undefined;

  const activeMarcos = payload.activeMarcos.filter((id): id is string => typeof id === 'string');
  const nodeProgression = parseNodeProgression(payload.nodeProgression);
  if (!nodeProgression) return undefined;

  return { activeMarcos, nodeProgression };
}
