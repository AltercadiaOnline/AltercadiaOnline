import type {
  StaticApagaoPayload,
  StaticWarRoomCallPayload,
  StaticWarRoomUpdatePayload,
} from '../../shared/static/staticNetworkTypes.js';

type StaticPulse =
  | { readonly type: 'static-apagao'; readonly payload: StaticApagaoPayload }
  | { readonly type: 'static-war-room-call'; readonly payload: StaticWarRoomCallPayload }
  | { readonly type: 'static-war-room-update'; readonly payload: StaticWarRoomUpdatePayload };

type StaticNetworkBroadcaster = (pulse: StaticPulse) => void;

let broadcaster: StaticNetworkBroadcaster | null = null;

export function bindStaticNetworkBroadcaster(fn: StaticNetworkBroadcaster): void {
  broadcaster = fn;
}

export function unbindStaticNetworkBroadcast(): void {
  broadcaster = null;
}

export function broadcastStaticPulse(pulse: StaticPulse): boolean {
  if (!broadcaster) {
    console.warn('[static] Broadcaster não vinculado — pulso descartado.');
    return false;
  }
  broadcaster(pulse);
  return true;
}
