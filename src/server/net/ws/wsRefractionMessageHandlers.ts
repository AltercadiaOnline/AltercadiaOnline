import type { WebSocket } from 'ws';
import type { RefractionBoothCompletePayload } from '../../../shared/cityMinigames/refractionBoothTypes.js';
import type { WsOutboundMessage } from '../../../shared/wsProtocol.js';
import { getRefractionBoothService } from '../../city/RefractionBoothService.js';
import type { LiveSocket, WorldConnectionState } from './wsConnectionTypes.js';

export type WsSendFn = (ws: WebSocket, message: WsOutboundMessage) => void;

function resolveRefractionWorldActor(
  worldConnections: ReadonlyMap<string, WorldConnectionState>,
  connectionId: string,
  payload: { readonly playerId: string; readonly characterId: number },
): { readonly playerId: string; readonly characterId: number } | null {
  const world = worldConnections.get(connectionId);
  if (!world) return null;
  if (world.playerId !== payload.playerId || world.characterId !== payload.characterId) {
    return null;
  }
  return { playerId: world.playerId, characterId: world.characterId };
}

export function handleWsRefractionBoothQuote(
  send: WsSendFn,
  ws: LiveSocket,
  worldConnections: ReadonlyMap<string, WorldConnectionState>,
  connectionId: string,
  payload: { readonly playerId: string; readonly characterId: number },
): void {
  const actor = resolveRefractionWorldActor(worldConnections, connectionId, payload);
  if (!actor) {
    send(ws, {
      type: 'refraction-booth-quote-result',
      payload: { ok: false, reason: 'Sessão de mundo inválida.' },
    });
    return;
  }

  const result = getRefractionBoothService().getQuote(actor);
  send(ws, { type: 'refraction-booth-quote-result', payload: result });
}

export async function handleWsRefractionBoothStart(
  send: WsSendFn,
  ws: LiveSocket,
  worldConnections: ReadonlyMap<string, WorldConnectionState>,
  connectionId: string,
  payload: { readonly playerId: string; readonly characterId: number; readonly displayName: string },
): Promise<void> {
  const actor = resolveRefractionWorldActor(worldConnections, connectionId, payload);
  if (!actor) {
    send(ws, {
      type: 'refraction-booth-started',
      payload: { ok: false, reason: 'Sessão de mundo inválida.' },
    });
    return;
  }

  const result = await getRefractionBoothService().startSession({
    playerId: actor.playerId,
    characterId: actor.characterId,
    displayName: payload.displayName,
  });
  send(ws, { type: 'refraction-booth-started', payload: result });
}

export async function handleWsRefractionBoothComplete(
  send: WsSendFn,
  ws: LiveSocket,
  worldConnections: ReadonlyMap<string, WorldConnectionState>,
  connectionId: string,
  payload: RefractionBoothCompletePayload & {
    readonly playerId: string;
    readonly characterId: number;
  },
): Promise<void> {
  const actor = resolveRefractionWorldActor(worldConnections, connectionId, payload);
  if (!actor) {
    send(ws, {
      type: 'refraction-booth-complete-result',
      payload: { ok: false, reason: 'Sessão de mundo inválida.' },
    });
    return;
  }

  const result = await getRefractionBoothService().completeSession({
    playerId: actor.playerId,
    characterId: actor.characterId,
    payload: {
      sessionId: payload.sessionId,
      hits: payload.hits,
      misses: payload.misses,
      durationMs: payload.durationMs,
      ...(payload.hitTimings ? { hitTimings: payload.hitTimings } : {}),
    },
  });
  send(ws, { type: 'refraction-booth-complete-result', payload: result });
}
