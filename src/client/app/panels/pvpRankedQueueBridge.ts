/**
 * Ponte WS da fila PvP rankeada — mesmo padrão do pveEncounterBridge.
 */

import {
  PVP_RANKED_STATION_ID,
} from '../../../shared/combat/pvp/pvpRankedQueueConfig.js';
import type { PvpRankedQueueSnapshot } from '../../../shared/combat/pvp/pvpRankedQueueProtocol.js';
import { getActivePlayerSkinBundleId } from '../../entities/player/activePlayerSkinBundle.js';

type PvpRankedOutboundType =
  | 'pvp-ranked-join'
  | 'pvp-ranked-leave'
  | 'pvp-ranked-ready'
  | 'pvp-ranked-unready';

type PvpRankedSender = (
  type: PvpRankedOutboundType,
  payload: {
    readonly stationId: string;
    readonly displayName?: string;
    readonly skinBundleId?: string;
  },
) => void;

type GlobalWithPvpRankedBridge = typeof globalThis & {
  __ALTERCADIA_PVP_RANKED_SENDER__?: PvpRankedSender | null;
};

function getSenderSlot(): GlobalWithPvpRankedBridge {
  return globalThis as GlobalWithPvpRankedBridge;
}

export function bindPvpRankedQueueWsSender(next: PvpRankedSender | null): void {
  getSenderSlot().__ALTERCADIA_PVP_RANKED_SENDER__ = next;
}

function send(
  type: PvpRankedOutboundType,
  payload: {
    readonly stationId: string;
    readonly displayName?: string;
    readonly skinBundleId?: string;
  },
): boolean {
  const sender = getSenderSlot().__ALTERCADIA_PVP_RANKED_SENDER__;
  if (!sender) return false;
  sender(type, payload);
  return true;
}

export function sendPvpRankedJoin(
  stationId: string,
  displayName?: string,
): boolean {
  return send('pvp-ranked-join', {
    stationId: stationId || PVP_RANKED_STATION_ID,
    ...(displayName ? { displayName } : {}),
    skinBundleId: getActivePlayerSkinBundleId(),
  });
}

export function sendPvpRankedLeave(stationId: string = PVP_RANKED_STATION_ID): boolean {
  return send('pvp-ranked-leave', { stationId });
}

export function sendPvpRankedReady(stationId: string = PVP_RANKED_STATION_ID): boolean {
  return send('pvp-ranked-ready', { stationId });
}

export function sendPvpRankedUnready(stationId: string = PVP_RANKED_STATION_ID): boolean {
  return send('pvp-ranked-unready', { stationId });
}

export type { PvpRankedQueueSnapshot };
