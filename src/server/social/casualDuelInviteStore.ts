import { createIntentId } from '../../shared/intent/clientIntent.js';
import {
  CASUAL_DUEL_COUNTDOWN_MS,
  CASUAL_DUEL_PENDING_TIMEOUT_MS,
  isWithinCasualDuelRange,
} from '../../shared/social/playerSocialRange.js';
import {
  CasualDuelPhase,
  type CasualDuelCancelReason,
  type CasualDuelSnapshot,
} from '../../shared/social/casualDuelTypes.js';
import { isPlayerInBattle } from '../models/playerSessionRegistry.js';
import { getWorldGameState, type ActivePlayerState } from '../world/WorldGameState.js';
import {
  getPvpRankedQueueManager,
  type PvpRankedQueueMember,
} from '../combat/pvp/PvpRankedQueueManager.js';
import { getPlayerTradeStore } from './playerTradeStore.js';

export type CasualDuelMatchPair = {
  readonly matchId: string;
  readonly inviteId: string;
  readonly peers: readonly [PvpRankedQueueMember, PvpRankedQueueMember];
};

type InviteRecord = {
  readonly inviteId: string;
  readonly createdAtMs: number;
  from: PvpRankedQueueMember;
  to: PvpRankedQueueMember;
  phase: typeof CasualDuelPhase.Pending | typeof CasualDuelPhase.Countdown | typeof CasualDuelPhase.Starting;
  countdownEndsAtMs: number | null;
};

type SnapshotListener = (snapshot: CasualDuelSnapshot, connectionIds: readonly string[]) => void;
type MatchReadyListener = (match: CasualDuelMatchPair) => void;

function toSnapshot(
  record: InviteRecord,
  phase: CasualDuelSnapshot['phase'] = record.phase,
  cancelReason: CasualDuelCancelReason | null = null,
): CasualDuelSnapshot {
  return {
    inviteId: record.inviteId,
    phase,
    fromPlayerId: record.from.playerId,
    fromCharacterId: record.from.characterId,
    fromDisplayName: record.from.displayName,
    toPlayerId: record.to.playerId,
    toCharacterId: record.to.characterId,
    toDisplayName: record.to.displayName,
    countdownEndsAtMs: record.countdownEndsAtMs,
    cancelReason,
  };
}

function exploringPeer(
  playerId: string,
  characterId: number,
): ActivePlayerState | null {
  const row = getWorldGameState().getByPlayer(playerId, characterId);
  if (!row || row.status !== 'exploring') return null;
  return row;
}

function isBusy(playerId: string, characterId: number): boolean {
  if (isPlayerInBattle(playerId, characterId)) return true;
  const queue = getPvpRankedQueueManager();
  const snapshot = queue.getSnapshot();
  if (snapshot.phase === 'countdown' || snapshot.phase === 'starting' || snapshot.phase === 'in_battle') {
    return snapshot.slots.some(
      (slot) => slot?.playerId === playerId && slot.characterId === characterId,
    );
  }
  return false;
}

export class CasualDuelInviteStore {
  private readonly invites = new Map<string, InviteRecord>();
  private readonly byPlayerKey = new Map<string, string>();
  private readonly snapshotListeners = new Set<SnapshotListener>();
  private readonly matchReadyListeners = new Set<MatchReadyListener>();
  private rangeTimer: ReturnType<typeof setInterval> | null = null;

  subscribe(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    this.ensureTimer();
    return () => this.snapshotListeners.delete(listener);
  }

  hasInvite(playerId: string, characterId: number): boolean {
    return this.byPlayerKey.has(this.playerKey(playerId, characterId));
  }

  onMatchReady(listener: MatchReadyListener): () => void {
    this.matchReadyListeners.add(listener);
    return () => this.matchReadyListeners.delete(listener);
  }

  createInvite(from: PvpRankedQueueMember, to: PvpRankedQueueMember):
    | { readonly ok: true; readonly snapshot: CasualDuelSnapshot }
    | { readonly ok: false; readonly reason: string } {
    if (from.playerId === to.playerId && from.characterId === to.characterId) {
      return { ok: false, reason: 'Não é possível convidar a si mesmo.' };
    }
    if (this.byPlayerKey.has(this.playerKey(from.playerId, from.characterId))) {
      return { ok: false, reason: 'Você já tem um convite de duelo pendente.' };
    }
    if (this.byPlayerKey.has(this.playerKey(to.playerId, to.characterId))) {
      return { ok: false, reason: 'Esse jogador já tem um convite pendente.' };
    }
    if (getPlayerTradeStore().hasOpenTrade(from.playerId, from.characterId)
      || getPlayerTradeStore().hasOpenTrade(to.playerId, to.characterId)) {
      return { ok: false, reason: 'Não é possível duelar durante um trade.' };
    }

    const fromWorld = exploringPeer(from.playerId, from.characterId);
    const toWorld = exploringPeer(to.playerId, to.characterId);
    if (!fromWorld) return { ok: false, reason: 'Você precisa estar no mundo para convidar.' };
    if (!toWorld) return { ok: false, reason: 'Jogador indisponível ou offline.' };
    if (fromWorld.mapId !== toWorld.mapId) return { ok: false, reason: 'O jogador não está no mesmo mapa.' };
    if (!isWithinCasualDuelRange(fromWorld.x, fromWorld.y, toWorld.x, toWorld.y)) {
      return { ok: false, reason: 'Chegue mais perto para convidar.' };
    }
    if (isBusy(from.playerId, from.characterId)) {
      return { ok: false, reason: 'Você está ocupado.' };
    }
    if (isBusy(to.playerId, to.characterId)) {
      return { ok: false, reason: 'O jogador está ocupado.' };
    }

    const inviteId = createIntentId();
    const record: InviteRecord = {
      inviteId,
      createdAtMs: Date.now(),
      from: { ...from, ready: false },
      to: { ...to, ready: false },
      phase: CasualDuelPhase.Pending,
      countdownEndsAtMs: null,
    };
    this.invites.set(inviteId, record);
    this.byPlayerKey.set(this.playerKey(from.playerId, from.characterId), inviteId);
    this.byPlayerKey.set(this.playerKey(to.playerId, to.characterId), inviteId);
    this.ensureTimer();
    const snapshot = toSnapshot(record);
    this.emit(snapshot, record);
    return { ok: true, snapshot };
  }

  respond(
    actorPlayerId: string,
    actorCharacterId: number,
    inviteId: string,
    accept: boolean,
  ):
    | { readonly ok: true; readonly snapshot: CasualDuelSnapshot }
    | { readonly ok: false; readonly reason: string } {
    const record = this.invites.get(inviteId);
    if (!record || record.phase !== CasualDuelPhase.Pending) {
      return { ok: false, reason: 'Convite expirado ou inválido.' };
    }
    const isTarget =
      record.to.playerId === actorPlayerId && record.to.characterId === actorCharacterId;
    if (!isTarget) {
      return { ok: false, reason: 'Este convite não é seu.' };
    }
    if (!accept) {
      return { ok: true, snapshot: this.cancel(record, 'refused') };
    }

    const fromWorld = exploringPeer(record.from.playerId, record.from.characterId);
    const toWorld = exploringPeer(record.to.playerId, record.to.characterId);
    if (!fromWorld || !toWorld) {
      return { ok: true, snapshot: this.cancel(record, 'offline') };
    }
    if (fromWorld.mapId !== toWorld.mapId) {
      return { ok: true, snapshot: this.cancel(record, 'map') };
    }
    if (!isWithinCasualDuelRange(fromWorld.x, fromWorld.y, toWorld.x, toWorld.y)) {
      return { ok: true, snapshot: this.cancel(record, 'range') };
    }
    if (isBusy(record.from.playerId, record.from.characterId)
      || isBusy(record.to.playerId, record.to.characterId)) {
      return { ok: true, snapshot: this.cancel(record, 'busy') };
    }

    record.phase = CasualDuelPhase.Countdown;
    record.countdownEndsAtMs = Date.now() + CASUAL_DUEL_COUNTDOWN_MS;
    const snapshot = toSnapshot(record);
    this.emit(snapshot, record);
    return { ok: true, snapshot };
  }

  onDisconnect(connectionId: string): void {
    for (const record of [...this.invites.values()]) {
      if (record.from.connectionId === connectionId || record.to.connectionId === connectionId) {
        this.cancel(record, 'offline');
      }
    }
  }

  markStarting(inviteId: string): void {
    const record = this.invites.get(inviteId);
    if (!record) return;
    record.phase = CasualDuelPhase.Starting;
    this.emit(toSnapshot(record), record);
  }

  failInvite(inviteId: string, reason: CasualDuelCancelReason): void {
    const record = this.invites.get(inviteId);
    if (!record) return;
    this.cancel(record, reason);
  }

  clearAfterBattle(inviteId: string): void {
    const record = this.invites.get(inviteId);
    if (!record) return;
    this.drop(record);
  }

  private tick(): void {
    const now = Date.now();
    for (const record of [...this.invites.values()]) {
      if (record.phase === CasualDuelPhase.Starting) continue;

      if (record.phase === CasualDuelPhase.Pending && now - record.createdAtMs >= CASUAL_DUEL_PENDING_TIMEOUT_MS) {
        this.cancel(record, 'timeout');
        continue;
      }

      const fromWorld = exploringPeer(record.from.playerId, record.from.characterId);
      const toWorld = exploringPeer(record.to.playerId, record.to.characterId);
      if (!fromWorld || !toWorld) {
        this.cancel(record, 'offline');
        continue;
      }
      if (fromWorld.mapId !== toWorld.mapId) {
        this.cancel(record, 'map');
        continue;
      }
      if (!isWithinCasualDuelRange(fromWorld.x, fromWorld.y, toWorld.x, toWorld.y)) {
        this.cancel(record, 'range');
        continue;
      }

      if (record.phase === CasualDuelPhase.Countdown && record.countdownEndsAtMs !== null && now >= record.countdownEndsAtMs) {
        this.finishCountdown(record);
      }
    }

    if (this.invites.size === 0) {
      this.clearTimer();
    }
  }

  private finishCountdown(record: InviteRecord): void {
    record.phase = CasualDuelPhase.Starting;
    const snapshot = toSnapshot(record);
    this.emit(snapshot, record);
    const match: CasualDuelMatchPair = {
      matchId: `casual_${record.inviteId}`,
      inviteId: record.inviteId,
      peers: [record.from, record.to],
    };
    for (const listener of this.matchReadyListeners) {
      listener(match);
    }
  }

  private cancel(record: InviteRecord, reason: CasualDuelCancelReason): CasualDuelSnapshot {
    const snapshot = toSnapshot(record, CasualDuelPhase.Cancelled, reason);
    this.emit(snapshot, record);
    this.drop(record);
    return snapshot;
  }

  private drop(record: InviteRecord): void {
    this.invites.delete(record.inviteId);
    this.byPlayerKey.delete(this.playerKey(record.from.playerId, record.from.characterId));
    this.byPlayerKey.delete(this.playerKey(record.to.playerId, record.to.characterId));
  }

  private emit(snapshot: CasualDuelSnapshot, record: InviteRecord): void {
    const connectionIds = [record.from.connectionId, record.to.connectionId];
    for (const listener of this.snapshotListeners) {
      listener(snapshot, connectionIds);
    }
  }

  private playerKey(playerId: string, characterId: number): string {
    return `${playerId}:${characterId}`;
  }

  private ensureTimer(): void {
    if (this.rangeTimer !== null) return;
    this.rangeTimer = setInterval(() => this.tick(), 200);
  }

  private clearTimer(): void {
    if (this.rangeTimer === null) return;
    clearInterval(this.rangeTimer);
    this.rangeTimer = null;
  }
}

let store: CasualDuelInviteStore | null = null;

export function getCasualDuelInviteStore(): CasualDuelInviteStore {
  store ??= new CasualDuelInviteStore();
  return store;
}

export function resetCasualDuelInviteStoreForTests(): void {
  store = null;
}
