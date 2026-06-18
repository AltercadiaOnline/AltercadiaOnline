import type { EquippedSlots } from './character/equipmentState.js';
import type { CombatDispatchPayload } from './combatWire.js';

import type { BattleEndedPayload } from './combat/battleEnded.js';

import type { ActionRequest } from './events.js';
import { sanitizeCombatActionIntent } from './combat/combatActionIntent.js';

import type { AuthoritativePlayerSnapshot } from './playerDataSnapshots.js';

import type { EconomyEvent } from './economy/events.js';

import type { MarcoDominanceInput } from './progression/estiloPersonagem.js';

import { parseMarcoDominanceInput } from './progression/parseMarcoDominanceInput.js';

import { isPlayerHonorGivenPayload } from './combat/playerHonorTypes.js';

import { sanitizePetSnapshotFromClient } from './pet/parsePetSnapshotInput.js';

import type { PetSnapshot } from './pet/petModel.js';
import type { CombatClassId } from './types.js';
import { normalizeBankCurrencyAmount } from './bank/bankCurrencyRules.js';
import { parsePortalTransitionRequestPayload } from './world/zoneTransition.js';

const COMBAT_CLASS_IDS: readonly CombatClassId[] = ['IMPETUS', 'COGITOR', 'TUTATOR', 'DISSOLUTUS'];

function parseCombatClassId(value: unknown): CombatClassId | undefined {
  if (typeof value !== 'string') return undefined;
  return COMBAT_CLASS_IDS.includes(value as CombatClassId) ? (value as CombatClassId) : undefined;
}

const EQUIPMENT_SNAPSHOT_SLOT_KEYS = [
  'head',
  'top',
  'bottom',
  'ring',
  'amulet',
  'book',
  'rune',
] as const satisfies readonly (keyof EquippedSlots)[];

function parseEquipmentSnapshot(value: unknown): EquippedSlots | undefined {
  if (typeof value !== 'object' || value === null) return undefined;

  const record = value as Record<string, unknown>;
  const equipped: EquippedSlots = {};

  for (const slot of EQUIPMENT_SNAPSHOT_SLOT_KEYS) {
    const itemId = record[slot];
    if (typeof itemId === 'string' && itemId.length > 0) {
      equipped[slot] = itemId;
    }
  }

  return Object.keys(equipped).length > 0 ? equipped : undefined;
}



/** Mensagens WebSocket do MVP (canal único JSON). */

export type WsOutboundMessage =

  | { readonly type: 'START_COMBAT'; readonly payload: { readonly battleId: string } }

  | { readonly type: 'combat-event'; readonly payload: CombatDispatchPayload }

  | { readonly type: 'BATTLE_ENDED'; readonly payload: BattleEndedPayload }

  | {
      readonly type: 'BATTLE_LOOT_PACKAGE';
      readonly payload: import('./combat/battleLootPackage.js').BattleLootPackagePayload;
    }

  | { readonly type: 'economy-event'; readonly payload: EconomyEvent }

  | { readonly type: 'full-state-sync'; readonly payload: AuthoritativePlayerSnapshot }

  | {
      readonly type: 'state-sync';
      readonly payload: import('./sync/syncProtocol.js').StateSyncPayload;
    }
  | {
      /** Peers próximos (AOI) — payload compacto: { t, m, p: [[cid,x,y,f], ...] } */
      readonly type: 'world-peers';
      readonly payload: import('./world/worldPeerWire.js').WorldPeersCompactPayload;
    }

  | { readonly type: 'book-activated'; readonly payload: { readonly bookId: string; readonly expiresAt: number } }

  | { readonly type: 'economy-exchange-result'; readonly payload: { readonly ok: boolean; readonly message?: string } }

  | {
      readonly type: 'economy-bank-result';
      readonly payload:
        | { readonly ok: true; readonly intentId?: string }
        | { readonly ok: false; readonly message: string; readonly intentId?: string };
    }

  | {
      readonly type: 'loot-collect-result';
      readonly payload: {
        readonly ok: boolean;
        readonly lootId: string;
        readonly battleId: string;
        readonly reason?: string;
        readonly partial?: boolean;
        readonly discardedQuantity?: number;
      };
    }

  | { readonly type: 'combat-error'; readonly payload: { readonly reason: string } }
  | {
      readonly type: 'world-login-result';
      readonly payload: {
        readonly ok: true;
        readonly currentMapId: string;
        readonly lastPosition: { readonly x: number; readonly y: number };
        readonly facing: string;
      };
    }
  | {
      readonly type: 'portal-transition-ready';
      readonly payload: import('./world/zoneTransition.js').PortalTransitionReadyPayload;
    }
  | {
      readonly type: 'portal-transition-failed';
      readonly payload: import('./world/zoneTransition.js').PortalTransitionFailedPayload;
    }
  | {
      readonly type: 'world-chronicles-result';
      readonly payload: import('./world/worldLoreTypes.js').WorldChroniclesSnapshot;
    }
  | {
      readonly type: 'chat-global';
      readonly payload: import('./world/globalChatTypes.js').ChatGlobalPayload;
    }
  | {
      readonly type: 'chat-global-rejected';
      readonly payload: { readonly reason: string };
    }
  | {
      readonly type: 'log-service';
      readonly payload: import('./world/logServiceTypes.js').LogServicePayload;
    }
  | {
      readonly type: 'refraction-booth-quote-result';
      readonly payload: import('./cityMinigames/refractionBoothTypes.js').RefractionBoothQuoteResult
        | import('./cityMinigames/refractionBoothTypes.js').RefractionBoothQuoteFailed;
    }
  | {
      readonly type: 'refraction-booth-started';
      readonly payload: import('./cityMinigames/refractionBoothTypes.js').RefractionBoothStarted
        | import('./cityMinigames/refractionBoothTypes.js').RefractionBoothStartFailed;
    }
  | {
      readonly type: 'refraction-booth-complete-result';
      readonly payload: import('./cityMinigames/refractionBoothTypes.js').RefractionBoothCompleteSuccess
        | import('./cityMinigames/refractionBoothTypes.js').RefractionBoothCompleteFailed;
    }
  | {
      readonly type: 'player-honor-result';
      readonly payload: import('./combat/playerHonorTypes.js').PlayerHonorResultPayload;
    }
  | {
      readonly type: 'intent-result';
      readonly payload: import('./intent/intentProtocol.js').IntentResult;
    }
  | {
      readonly type: 'intent-failed';
      readonly payload: import('./intent/intentProtocol.js').IntentFailedPayload;
    }
  | {
      readonly type: 'intent-success';
      readonly payload: import('./intent/intentProtocol.js').IntentSuccessPayload;
    };



export type WsInboundMessage =

  | {
      readonly type: 'combat-join';
      readonly payload?: {
        readonly displayName?: string;
        readonly classId?: CombatClassId;
        readonly activeMovesets?: readonly string[];
        readonly monsterInstanceId?: string;
        readonly worldVitals?: {
          readonly hpCurrent: number;
          readonly hpMax: number;
          readonly mpCurrent: number;
          readonly mpMax: number;
        };
        /** Snapshot Marcos — mesma fonte que globalPlayerStore + Ficha. */
        readonly marcoDominance?: MarcoDominanceInput;
        /** Companheiro dimensional operacional — stats sanitizados no servidor. */
        readonly pet?: PetSnapshot;
        /** IDs equipados na UI (armadura, runas, livros, etc.). */
        readonly equipmentSnapshot?: EquippedSlots;
      };
    }

  | { readonly type: 'combat-action'; readonly payload: ActionRequest }

  | { readonly type: 'mirror-combat-action'; readonly payload: ActionRequest }

  | { readonly type: 'dev-spawn-mirror-player'; readonly payload?: { readonly battleId?: string } }

  | { readonly type: 'combat-forfeit'; readonly payload: { readonly battleId: string } }

  | { readonly type: 'combat-collect-loot'; readonly payload: { readonly lootId: string; readonly battleId: string } }

  | { readonly type: 'combat-confirm-loot'; readonly payload: { readonly lootId: string; readonly battleId: string } }

  | { readonly type: 'combat-dismiss-loot'; readonly payload: { readonly lootId: string } }

  | { readonly type: 'request-full-state'; readonly payload: { readonly characterId: number } }

  | { readonly type: 'activate-book'; readonly payload: { readonly bookId: string } }

  | { readonly type: 'economy-exchange-alter'; readonly payload: { readonly alterAmount: number; readonly characterId?: number } }
  | {
      readonly type: 'economy-bank-transaction';
      readonly payload: {
        readonly intentId: string;
        readonly characterId: number;
        readonly operation: 'deposit-item' | 'withdraw-item' | 'deposit-currency' | 'withdraw-currency';
        readonly itemId?: string;
        readonly quantity?: number;
        readonly currency?: 'volts' | 'alter';
        readonly amount?: number;
        readonly clientReportedX?: number;
        readonly clientReportedY?: number;
      };
    }
  | {
      readonly type: 'world-login';
      readonly payload: {
        readonly playerId: string;
        readonly characterId: number;
        /** Shard reportado pelo cliente — validado contra SERVER_ID do processo. */
        readonly serverId: string;
        readonly displayName?: string;
        readonly clientMapId?: string;
        readonly clientPosition?: { readonly x: number; readonly y: number };
        readonly accessToken?: string;
      };
    }
  | {
      readonly type: 'position-sync';
      readonly payload: {
        readonly characterId: number;
        readonly currentMapId: string;
        readonly lastPosition: { readonly x: number; readonly y: number };
        readonly facing?: string;
        readonly reason?: 'heartbeat' | 'logout' | 'battle';
      };
    }
  | {
      readonly type: 'portal-transition-request';
      readonly payload: import('./world/zoneTransition.js').PortalTransitionRequestPayload;
    }
  | {
      readonly type: 'world-chronicles-request';
      readonly payload: {
        readonly playerId: string;
        readonly characterId: number;
        readonly prioritizeAbsence?: boolean;
      };
    }
    | {
      readonly type: 'chat-global-send';
      readonly payload: {
        readonly playerId: string;
        readonly characterId: number;
        readonly text: string;
      };
    }
  | {
      readonly type: 'refraction-booth-quote';
      readonly payload: {
        readonly playerId: string;
        readonly characterId: number;
      };
    }
  | {
      readonly type: 'refraction-booth-start';
      readonly payload: {
        readonly playerId: string;
        readonly characterId: number;
        readonly displayName: string;
      };
    }
  | {
      readonly type: 'refraction-booth-complete';
      readonly payload: import('./cityMinigames/refractionBoothTypes.js').RefractionBoothCompletePayload & {
        readonly playerId: string;
        readonly characterId: number;
      };
    }
  | {
      readonly type: 'player-honor-given';
      readonly payload: import('./combat/playerHonorTypes.js').PlayerHonorGivenPayload;
    }
  | {
      readonly type: 'player-intent';
      readonly payload: import('./intent/clientIntent.js').ClientIntent;
    };



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
        const classId = parseCombatClassId(p.classId);
        const activeMovesets = Array.isArray(p.activeMovesets)
          ? p.activeMovesets.filter((id): id is string => typeof id === 'string')
          : undefined;
        const monsterInstanceId = typeof p.monsterInstanceId === 'string' && p.monsterInstanceId.length > 0
          ? p.monsterInstanceId
          : undefined;
        const worldVitalsRaw = p.worldVitals;
        let worldVitals: {
          hpCurrent: number;
          hpMax: number;
          mpCurrent: number;
          mpMax: number;
        } | undefined;
        if (typeof worldVitalsRaw === 'object' && worldVitalsRaw !== null) {
          const v = worldVitalsRaw as Record<string, unknown>;
          if (
            typeof v.hpCurrent === 'number'
            && typeof v.hpMax === 'number'
            && typeof v.mpCurrent === 'number'
            && typeof v.mpMax === 'number'
          ) {
            worldVitals = {
              hpCurrent: v.hpCurrent,
              hpMax: v.hpMax,
              mpCurrent: v.mpCurrent,
              mpMax: v.mpMax,
            };
          }
        }

        const joinPayload: {
          displayName?: string;
          classId?: CombatClassId;
          activeMovesets?: readonly string[];
          monsterInstanceId?: string;
          worldVitals?: {
            hpCurrent: number;
            hpMax: number;
            mpCurrent: number;
            mpMax: number;
          };
          marcoDominance?: MarcoDominanceInput;
          pet?: PetSnapshot;
          equipmentSnapshot?: EquippedSlots;
        } = {};
        if (displayName !== undefined) joinPayload.displayName = displayName;
        if (classId !== undefined) joinPayload.classId = classId;
        if (activeMovesets !== undefined && activeMovesets.length > 0) {
          joinPayload.activeMovesets = activeMovesets;
        }
        if (monsterInstanceId !== undefined) joinPayload.monsterInstanceId = monsterInstanceId;
        if (worldVitals !== undefined) joinPayload.worldVitals = worldVitals;
        const marcoDominance = parseMarcoDominanceInput(p.marcoDominance);
        if (marcoDominance !== undefined) joinPayload.marcoDominance = marcoDominance;
        const pet = sanitizePetSnapshotFromClient(p.pet);
        if (pet !== null) joinPayload.pet = pet;
        const equipmentSnapshot = parseEquipmentSnapshot(p.equipmentSnapshot);
        if (equipmentSnapshot !== undefined) joinPayload.equipmentSnapshot = equipmentSnapshot;

        return Object.keys(joinPayload).length > 0
          ? { type: 'combat-join', payload: joinPayload }
          : { type: 'combat-join' };

      }

      return null;

    }

    if (type === 'activate-book') {

      const payload = record.payload;

      if (typeof payload !== 'object' || payload === null) return null;

      const bookId = (payload as Record<string, unknown>).bookId;

      if (typeof bookId !== 'string' || bookId.length === 0) return null;

      return { type: 'activate-book', payload: { bookId } };

    }

    if (type === 'economy-bank-transaction') {
      const payload = record.payload;
      if (typeof payload !== 'object' || payload === null) return null;
      const p = payload as Record<string, unknown>;
      const intentId = p.intentId;
      const characterId = p.characterId;
      const operation = p.operation;
      if (typeof intentId !== 'string' || intentId.length === 0) return null;
      if (typeof characterId !== 'number' || !Number.isInteger(characterId) || characterId <= 0) return null;
      if (
        operation !== 'deposit-item'
        && operation !== 'withdraw-item'
        && operation !== 'deposit-currency'
        && operation !== 'withdraw-currency'
      ) {
        return null;
      }

      const base = { intentId, characterId, operation } as const;
      const clientReportedX = p.clientReportedX;
      const clientReportedY = p.clientReportedY;
      const clientPositionFields =
        typeof clientReportedX === 'number'
        && Number.isFinite(clientReportedX)
        && typeof clientReportedY === 'number'
        && Number.isFinite(clientReportedY)
          ? { clientReportedX, clientReportedY }
          : {};

      if (operation === 'deposit-item' || operation === 'withdraw-item') {
        const itemId = p.itemId;
        if (typeof itemId !== 'string' || itemId.length === 0) return null;
        const quantity = p.quantity;
        if (quantity !== undefined && (typeof quantity !== 'number' || quantity <= 0)) return null;
        return {
          type: 'economy-bank-transaction',
          payload: {
            ...base,
            ...clientPositionFields,
            itemId,
            ...(quantity !== undefined ? { quantity: Math.floor(quantity) } : {}),
          },
        };
      }

      const currency = p.currency;
      const amount = p.amount;
      if (currency !== 'volts' && currency !== 'alter') return null;
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return null;
      const normalizedAmount = Math.floor(amount);
      if (normalizeBankCurrencyAmount(normalizedAmount) === null) return null;
      return {
        type: 'economy-bank-transaction',
        payload: {
          ...base,
          ...clientPositionFields,
          currency,
          amount: normalizedAmount,
        },
      };
    }

    if (type === 'economy-exchange-alter') {

      const payload = record.payload;

      if (typeof payload !== 'object' || payload === null) return null;

      const p = payload as Record<string, unknown>;

      const alterAmount = p.alterAmount;

      if (typeof alterAmount !== 'number' || !Number.isInteger(alterAmount) || alterAmount <= 0) {

        return null;

      }

      const characterId = p.characterId;
      const exchangePayload: { readonly alterAmount: number; readonly characterId?: number } = { alterAmount };
      if (typeof characterId === 'number') {
        return {
          type: 'economy-exchange-alter',
          payload: { alterAmount, characterId },
        };
      }

      return {
        type: 'economy-exchange-alter',
        payload: exchangePayload,
      };

    }

    if (type === 'combat-action') {
      const payload = sanitizeCombatActionIntent(record.payload);
      if (!payload) return null;
      return { type: 'combat-action', payload };
    }

    if (type === 'mirror-combat-action') {
      const payload = sanitizeCombatActionIntent(record.payload);
      if (!payload) return null;
      return { type: 'mirror-combat-action', payload };
    }

    if (type === 'dev-spawn-mirror-player') {
      const payload = record.payload;
      if (payload === undefined) {
        return { type: 'dev-spawn-mirror-player' };
      }
      if (typeof payload === 'object' && payload !== null) {
        const battleId = (payload as Record<string, unknown>).battleId;
        if (typeof battleId === 'string' && battleId.length > 0) {
          return { type: 'dev-spawn-mirror-player', payload: { battleId } };
        }
      }
      return { type: 'dev-spawn-mirror-player' };
    }

    if (type === 'combat-forfeit') {

      const payload = record.payload;

      if (typeof payload !== 'object' || payload === null) return null;

      const battleId = (payload as Record<string, unknown>).battleId;

      if (typeof battleId !== 'string' || battleId.length === 0) return null;

      return { type: 'combat-forfeit', payload: { battleId } };

    }

    if (type === 'combat-collect-loot' || type === 'combat-confirm-loot') {
      const payload = record.payload;
      if (typeof payload !== 'object' || payload === null) return null;
      const p = payload as Record<string, unknown>;
      const lootId = p.lootId;
      const battleId = p.battleId;
      if (typeof lootId !== 'string' || lootId.length === 0) return null;
      if (typeof battleId !== 'string' || battleId.length === 0) return null;
      const normalizedType = type === 'combat-confirm-loot' ? 'combat-confirm-loot' : 'combat-collect-loot';
      return { type: normalizedType, payload: { lootId, battleId } };
    }

    if (type === 'combat-dismiss-loot') {
      const payload = record.payload;
      if (typeof payload !== 'object' || payload === null) return null;
      const lootId = (payload as Record<string, unknown>).lootId;
      if (typeof lootId !== 'string' || lootId.length === 0) return null;
      return { type: 'combat-dismiss-loot', payload: { lootId } };
    }

    if (type === 'request-full-state') {
      const payload = record.payload;
      if (typeof payload !== 'object' || payload === null) return null;
      const characterId = (payload as Record<string, unknown>).characterId;
      if (typeof characterId !== 'number' || !Number.isFinite(characterId)) return null;
      return { type: 'request-full-state', payload: { characterId } };
    }

    if (type === 'world-login') {
      const payload = record.payload;
      if (typeof payload !== 'object' || payload === null) return null;
      const p = payload as Record<string, unknown>;
      const playerId = p.playerId;
      const characterId = p.characterId;
      if (typeof playerId !== 'string' || playerId.length === 0) return null;
      if (typeof characterId !== 'number' || !Number.isFinite(characterId)) return null;

      const serverId = p.serverId;
      if (typeof serverId !== 'string' || serverId.trim().length === 0) return null;

      const loginPayload: {
        playerId: string;
        characterId: number;
        serverId: string;
        displayName?: string;
        clientMapId?: string;
        clientPosition?: { x: number; y: number };
        accessToken?: string;
      } = { playerId, characterId, serverId: serverId.trim().toLowerCase() };

      if (typeof p.displayName === 'string') loginPayload.displayName = p.displayName;
      if (typeof p.accessToken === 'string' && p.accessToken.length > 0) {
        loginPayload.accessToken = p.accessToken;
      }

      if (typeof p.clientMapId === 'string') loginPayload.clientMapId = p.clientMapId;

      const clientPosition = p.clientPosition;
      if (
        typeof clientPosition === 'object' &&
        clientPosition !== null &&
        typeof (clientPosition as Record<string, unknown>).x === 'number' &&
        typeof (clientPosition as Record<string, unknown>).y === 'number'
      ) {
        loginPayload.clientPosition = {
          x: (clientPosition as Record<string, unknown>).x as number,
          y: (clientPosition as Record<string, unknown>).y as number,
        };
      }

      return { type: 'world-login', payload: loginPayload };
    }

    if (type === 'position-sync') {
      const payload = record.payload;
      if (typeof payload !== 'object' || payload === null) return null;
      const p = payload as Record<string, unknown>;
      const characterId = p.characterId;
      const currentMapId = p.currentMapId;
      const lastPosition = p.lastPosition;
      if (typeof characterId !== 'number' || !Number.isFinite(characterId)) return null;
      if (typeof currentMapId !== 'string' || currentMapId.length === 0) return null;
      if (typeof lastPosition !== 'object' || lastPosition === null) return null;
      const pos = lastPosition as Record<string, unknown>;
      if (typeof pos.x !== 'number' || typeof pos.y !== 'number') return null;
      if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;

      const syncPayload: {
        characterId: number;
        currentMapId: string;
        lastPosition: { x: number; y: number };
        facing?: string;
        reason?: 'heartbeat' | 'logout' | 'battle';
      } = {
        characterId,
        currentMapId,
        lastPosition: { x: pos.x, y: pos.y },
      };

      if (typeof p.facing === 'string') syncPayload.facing = p.facing;

      const reason = p.reason;
      if (reason === 'heartbeat' || reason === 'logout' || reason === 'battle') {
        syncPayload.reason = reason;
      }

      return { type: 'position-sync', payload: syncPayload };
    }

    if (type === 'portal-transition-request') {
      const payload = parsePortalTransitionRequestPayload(record.payload);
      if (!payload) return null;
      return { type: 'portal-transition-request', payload };
    }

    if (type === 'world-chronicles-request') {
      const payload = record.payload;
      if (typeof payload !== 'object' || payload === null) return null;
      const p = payload as Record<string, unknown>;
      const playerId = p.playerId;
      const characterId = p.characterId;
      if (typeof playerId !== 'string' || playerId.length === 0) return null;
      if (typeof characterId !== 'number' || !Number.isFinite(characterId)) return null;

      const requestPayload: {
        playerId: string;
        characterId: number;
        prioritizeAbsence?: boolean;
      } = { playerId, characterId };

      if (p.prioritizeAbsence === true) {
        requestPayload.prioritizeAbsence = true;
      }

      return { type: 'world-chronicles-request', payload: requestPayload };
    }

    if (type === 'chat-global-send') {
      const payload = record.payload;
      if (typeof payload !== 'object' || payload === null) return null;
      const p = payload as Record<string, unknown>;
      const playerId = p.playerId;
      const characterId = p.characterId;
      const text = p.text;
      if (typeof playerId !== 'string' || playerId.length === 0) return null;
      if (typeof characterId !== 'number' || !Number.isFinite(characterId)) return null;
      if (typeof text !== 'string') return null;
      return { type: 'chat-global-send', payload: { playerId, characterId, text } };
    }

    if (type === 'refraction-booth-quote') {
      const payload = record.payload;
      if (typeof payload !== 'object' || payload === null) return null;
      const p = payload as Record<string, unknown>;
      if (typeof p.playerId !== 'string' || p.playerId.length === 0) return null;
      if (typeof p.characterId !== 'number' || !Number.isFinite(p.characterId)) return null;
      return {
        type: 'refraction-booth-quote',
        payload: { playerId: p.playerId, characterId: p.characterId },
      };
    }

    if (type === 'refraction-booth-start') {
      const payload = record.payload;
      if (typeof payload !== 'object' || payload === null) return null;
      const p = payload as Record<string, unknown>;
      if (typeof p.playerId !== 'string' || p.playerId.length === 0) return null;
      if (typeof p.characterId !== 'number' || !Number.isFinite(p.characterId)) return null;
      if (typeof p.displayName !== 'string' || p.displayName.length === 0) return null;
      return {
        type: 'refraction-booth-start',
        payload: {
          playerId: p.playerId,
          characterId: p.characterId,
          displayName: p.displayName,
        },
      };
    }

    if (type === 'refraction-booth-complete') {
      const payload = record.payload;
      if (typeof payload !== 'object' || payload === null) return null;
      const p = payload as Record<string, unknown>;
      if (typeof p.playerId !== 'string' || p.playerId.length === 0) return null;
      if (typeof p.characterId !== 'number' || !Number.isFinite(p.characterId)) return null;
      if (typeof p.sessionId !== 'string' || p.sessionId.length === 0) return null;
      if (typeof p.hits !== 'number' || !Number.isFinite(p.hits)) return null;
      if (typeof p.misses !== 'number' || !Number.isFinite(p.misses)) return null;
      if (typeof p.durationMs !== 'number' || !Number.isFinite(p.durationMs)) return null;
      const completePayload: {
        playerId: string;
        characterId: number;
        sessionId: string;
        hits: number;
        misses: number;
        durationMs: number;
        hitTimings?: number[];
      } = {
        playerId: p.playerId,
        characterId: p.characterId,
        sessionId: p.sessionId,
        hits: p.hits,
        misses: p.misses,
        durationMs: p.durationMs,
      };
      if (Array.isArray(p.hitTimings)) {
        const timings = p.hitTimings.filter((value): value is number => typeof value === 'number');
        if (timings.length > 0) completePayload.hitTimings = timings;
      }
      return { type: 'refraction-booth-complete', payload: completePayload };
    }

    if (type === 'player-honor-given') {
      const payload = record.payload;
      if (!isPlayerHonorGivenPayload(payload)) return null;
      return { type: 'player-honor-given', payload };
    }

    if (type === 'player-intent') {
      const payload = record.payload;
      if (!payload || typeof payload !== 'object') return null;
      const p = payload as Record<string, unknown>;
      if (typeof p.intentId !== 'string' || typeof p.type !== 'string') return null;
      if (typeof p.timestamp !== 'number' || !Number.isFinite(p.timestamp)) return null;
      if (p.payload === undefined) return null;
      const correlationId = typeof p.correlationId === 'string' && p.correlationId.length > 0
        ? p.correlationId
        : p.intentId;
      return {
        type: 'player-intent',
        payload: {
          intentId: p.intentId,
          correlationId,
          type: p.type,
          payload: p.payload,
          timestamp: p.timestamp,
          ...(typeof p.serverId === 'string' && p.serverId.trim().length > 0
            ? { serverId: p.serverId.trim().toLowerCase() }
            : {}),
        },
      };
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
  return sanitizeCombatActionIntent(value) !== null;
}

export function parseCombatActionIntent(value: unknown): ActionRequest | null {
  return sanitizeCombatActionIntent(value);
}


