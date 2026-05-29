import type { CombatDispatchPayload } from './combatWire.js';
import type { ActionRequest } from './events.js';

/** Mensagens WebSocket do MVP (canal único JSON). */
export type WsOutboundMessage =
  | { readonly type: 'combat-event'; readonly payload: CombatDispatchPayload }
  | { readonly type: 'combat-error'; readonly payload: { readonly reason: string } };

export type WsInboundMessage =
  | { readonly type: 'combat-join'; readonly payload?: { readonly displayName?: string } }
  | { readonly type: 'combat-action'; readonly payload: ActionRequest };

export function parseWsInbound(raw: string): WsInboundMessage | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const record = data as Record<string, unknown>;
    const type = record.type;
    if (type === 'combat-join') {
      const payload = record.payload;
      if (payload === undefined) return { type: 'combat-join' };
      if (typeof payload === 'object' && payload !== null) {
        const p = payload as Record<string, unknown>;
        const displayName = typeof p.displayName === 'string' ? p.displayName : undefined;
        return displayName !== undefined
          ? { type: 'combat-join', payload: { displayName } }
          : { type: 'combat-join' };
      }
      return null;
    }
    if (type === 'combat-action' && isActionRequest(record.payload)) {
      return { type: 'combat-action', payload: record.payload };
    }
    return null;
  } catch {
    return null;
  }
}

export function serializeWsOutbound(message: WsOutboundMessage): string {
  return JSON.stringify(message);
}

export function isActionRequest(value: unknown): value is ActionRequest {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  if (typeof r.battleId !== 'string' || typeof r.actorId !== 'string') return false;
  if (typeof r.turn !== 'number' || !Number.isFinite(r.turn)) return false;
  if (r.skillId !== null && typeof r.skillId !== 'string') return false;
  if (typeof r.requestId !== 'string' || r.requestId.length === 0) return false;
  if (r.requestId.length > 128) return false;
  if (r.priorityHint !== undefined && r.priorityHint !== 1 && r.priorityHint !== 2 && r.priorityHint !== 3) {
    return false;
  }
  if (r.consumableId !== undefined && r.consumableId !== null && typeof r.consumableId !== 'string') {
    return false;
  }
  if (r.consumableHeal !== undefined && typeof r.consumableHeal !== 'number') return false;
  return true;
}
