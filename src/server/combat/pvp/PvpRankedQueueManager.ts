/**
 * Fila autoritativa 1x1 no púlpito — join/ready/countdown; Hub inicia o duelo.
 */

import {
  DEFAULT_PLAYER_SKIN_BUNDLE_ID,
  type PlayerSkinBundleId,
} from '../../../shared/character/playerSkinBundle.js';
import { createIntentId } from '../../../shared/intent/clientIntent.js';
import {
  PVP_RANKED_ACCEPT_COUNTDOWN_MS,
  PVP_RANKED_QUEUE_SLOT_COUNT,
  PVP_RANKED_STATION_ID,
  PVP_RANKED_STATION_LABEL,
} from '../../../shared/combat/pvp/pvpRankedQueueConfig.js';
import {
  createEmptyPvpRankedQueueSnapshot,
  type PvpRankedQueueErrorCode,
  type PvpRankedQueuePhase,
  type PvpRankedQueueSlotWire,
  type PvpRankedQueueSnapshot,
} from '../../../shared/combat/pvp/pvpRankedQueueProtocol.js';

export type PvpRankedQueueMember = {
  readonly connectionId: string;
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly skinBundleId: PlayerSkinBundleId;
  ready: boolean;
};

export type PvpRankedMatchPair = {
  readonly matchId: string;
  readonly stationId: string;
  readonly peers: readonly [PvpRankedQueueMember, PvpRankedQueueMember];
};

type JoinOk = { readonly ok: true; readonly snapshot: PvpRankedQueueSnapshot };
type JoinErr = { readonly ok: false; readonly reason: PvpRankedQueueErrorCode };
type JoinResult = JoinOk | JoinErr;

type Listener = (snapshot: PvpRankedQueueSnapshot) => void;
type MatchReadyListener = (match: PvpRankedMatchPair) => void;

function remainingExclusive(phase: PvpRankedQueuePhase, slotsFilled: number): boolean {
  if (phase === 'countdown' || phase === 'starting' || phase === 'in_battle') return true;
  return slotsFilled > 0;
}

export class PvpRankedQueueManager {
  private readonly stationId: string;
  private readonly label: string;
  private slots: [PvpRankedQueueMember | null, PvpRankedQueueMember | null] = [null, null];
  private phase: PvpRankedQueuePhase = 'idle';
  private countdownEndsAtMs: number | null = null;
  private matchId: string | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private readonly listeners = new Set<Listener>();
  private readonly matchReadyListeners = new Set<MatchReadyListener>();
  /** connectionId → viewer (painel aberto sem estar nos slots — ainda recebe snapshot). */
  private readonly viewers = new Set<string>();

  constructor(
    stationId = PVP_RANKED_STATION_ID,
    label = PVP_RANKED_STATION_LABEL,
  ) {
    this.stationId = stationId;
    this.label = label;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onMatchReady(listener: MatchReadyListener): () => void {
    this.matchReadyListeners.add(listener);
    return () => this.matchReadyListeners.delete(listener);
  }

  getSnapshot(): PvpRankedQueueSnapshot {
    return this.buildSnapshot();
  }

  /** Conexões que devem receber o snapshot (slots + viewers). */
  listBroadcastConnectionIds(): readonly string[] {
    const ids = new Set<string>(this.viewers);
    for (const slot of this.slots) {
      if (slot) ids.add(slot.connectionId);
    }
    return [...ids];
  }

  addViewer(connectionId: string): void {
    this.viewers.add(connectionId);
  }

  removeViewer(connectionId: string): void {
    this.viewers.delete(connectionId);
  }

  join(
    member: Omit<PvpRankedQueueMember, 'ready'>,
    stationId: string = PVP_RANKED_STATION_ID,
  ): JoinResult {
    if (stationId !== this.stationId) {
      return { ok: false, reason: 'INVALID_STATION' };
    }

    if (this.phase === 'countdown' || this.phase === 'starting' || this.phase === 'in_battle') {
      const existing = this.findSlotIndexByPlayer(member.playerId, member.characterId);
      if (existing >= 0) {
        this.patchSlot(existing, { ...this.slots[existing]!, ...member, ready: this.slots[existing]!.ready });
        return { ok: true, snapshot: this.buildSnapshot() };
      }
      return { ok: false, reason: 'EXCLUSIVE_LOCKED' };
    }

    const existingIndex = this.findSlotIndexByPlayer(member.playerId, member.characterId);
    if (existingIndex >= 0) {
      const prev = this.slots[existingIndex]!;
      this.patchSlot(existingIndex, {
        ...prev,
        connectionId: member.connectionId,
        displayName: member.displayName,
        skinBundleId: member.skinBundleId,
      });
      this.viewers.add(member.connectionId);
      return { ok: true, snapshot: this.buildSnapshot() };
    }

    const otherConn = this.findSlotIndexByConnection(member.connectionId);
    if (otherConn >= 0) {
      return { ok: false, reason: 'ALREADY_QUEUED' };
    }

    const free = this.slots.findIndex((s) => s === null);
    if (free < 0) {
      return { ok: false, reason: 'STATION_FULL' };
    }

    this.patchSlot(free, { ...member, ready: false });
    this.viewers.add(member.connectionId);
    this.phase = 'waiting';
    this.countdownEndsAtMs = null;
    this.matchId = null;
    this.emit();
    return { ok: true, snapshot: this.buildSnapshot() };
  }

  leave(connectionId: string): JoinResult {
    this.viewers.delete(connectionId);
    const index = this.findSlotIndexByConnection(connectionId);
    if (index < 0) {
      return { ok: true, snapshot: this.buildSnapshot() };
    }

    if (this.phase === 'in_battle' || this.phase === 'starting') {
      // Countdown já consumido / bootstrap em andamento — leave do painel não cancela o duelo.
      return { ok: true, snapshot: this.buildSnapshot() };
    }

    this.clearCountdown();
    this.slots = [null, null];
    this.phase = 'idle';
    this.countdownEndsAtMs = null;
    this.matchId = null;
    this.emit();
    return { ok: true, snapshot: this.buildSnapshot() };
  }

  /** Remove conexão (disconnect) — cancela fila se ainda não em batalha. */
  onDisconnect(connectionId: string): void {
    this.viewers.delete(connectionId);
    const index = this.findSlotIndexByConnection(connectionId);
    if (index < 0) return;
    if (this.phase === 'in_battle' || this.phase === 'starting') return;
    this.clearCountdown();
    this.slots = [null, null];
    this.phase = 'idle';
    this.countdownEndsAtMs = null;
    this.matchId = null;
    this.emit();
  }

  setReady(connectionId: string, ready: boolean): JoinResult {
    const index = this.findSlotIndexByConnection(connectionId);
    if (index < 0) return { ok: false, reason: 'NOT_IN_QUEUE' };
    if (this.phase === 'starting' || this.phase === 'in_battle') {
      return { ok: false, reason: 'EXCLUSIVE_LOCKED' };
    }

    const slot = this.slots[index]!;
    this.patchSlot(index, { ...slot, ready });

    if (!this.bothReady()) {
      this.clearCountdown();
      this.phase = 'waiting';
      this.countdownEndsAtMs = null;
      this.emit();
      return { ok: true, snapshot: this.buildSnapshot() };
    }

    this.beginCountdown();
    return { ok: true, snapshot: this.buildSnapshot() };
  }

  /** Após START_COMBAT enviado — marca estação ocupada até limpar. */
  markInBattle(matchId: string): void {
    this.clearCountdown();
    this.phase = 'in_battle';
    this.matchId = matchId;
    this.countdownEndsAtMs = null;
    this.slots = [null, null];
    this.emit();
  }

  /** Libera estação após fim do duelo. */
  clearAfterBattle(): void {
    this.clearCountdown();
    this.phase = 'idle';
    this.slots = [null, null];
    this.countdownEndsAtMs = null;
    this.matchId = null;
    this.emit();
  }

  private beginCountdown(): void {
    this.clearCountdown();
    const endsAt = Date.now() + PVP_RANKED_ACCEPT_COUNTDOWN_MS;
    this.phase = 'countdown';
    this.countdownEndsAtMs = endsAt;
    this.matchId = null;
    this.emit();

    this.countdownTimer = setInterval(() => {
      if (this.countdownEndsAtMs === null) {
        this.clearCountdown();
        return;
      }
      if (Date.now() >= this.countdownEndsAtMs) {
        this.finishCountdown();
        return;
      }
      this.emit();
    }, 200);
  }

  private finishCountdown(): void {
    this.clearCountdown();
    const a = this.slots[0];
    const b = this.slots[1];
    if (!a || !b || !a.ready || !b.ready) {
      this.phase = 'waiting';
      this.countdownEndsAtMs = null;
      this.emit();
      return;
    }

    const matchId = createIntentId();
    this.phase = 'starting';
    this.matchId = matchId;
    this.countdownEndsAtMs = null;
    this.emit();

    const match: PvpRankedMatchPair = {
      matchId,
      stationId: this.stationId,
      peers: [{ ...a }, { ...b }],
    };
    for (const listener of this.matchReadyListeners) {
      try {
        listener(match);
      } catch (error) {
        console.error('[PvpRankedQueue] matchReady listener failed', error);
      }
    }
  }

  private bothReady(): boolean {
    const filled = this.slots.filter(Boolean) as PvpRankedQueueMember[];
    return (
      filled.length === PVP_RANKED_QUEUE_SLOT_COUNT
      && filled.every((s) => s.ready)
    );
  }

  private findSlotIndexByPlayer(playerId: string, characterId: number): number {
    return this.slots.findIndex(
      (s) => s !== null && s.playerId === playerId && s.characterId === characterId,
    );
  }

  private findSlotIndexByConnection(connectionId: string): number {
    return this.slots.findIndex((s) => s !== null && s.connectionId === connectionId);
  }

  private patchSlot(index: number, member: PvpRankedQueueMember): void {
    const next: [PvpRankedQueueMember | null, PvpRankedQueueMember | null] = [
      this.slots[0],
      this.slots[1],
    ];
    next[index] = member;
    this.slots = next;
  }

  private clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private toWireSlot(member: PvpRankedQueueMember | null): PvpRankedQueueSlotWire | null {
    if (!member) return null;
    return {
      playerId: member.playerId,
      characterId: member.characterId,
      displayName: member.displayName,
      ready: member.ready,
      skinBundleId: member.skinBundleId || DEFAULT_PLAYER_SKIN_BUNDLE_ID,
    };
  }

  private buildSnapshot(): PvpRankedQueueSnapshot {
    const filled = this.slots.filter(Boolean).length;
    const empty = createEmptyPvpRankedQueueSnapshot(this.stationId, this.label);
    let statusMessage = empty.statusMessage;
    if (this.phase === 'countdown') {
      statusMessage = 'Ambos aceitaram — entrando na batalha rankeada…';
    } else if (this.phase === 'starting') {
      statusMessage = 'Entrando na batalha rankeada…';
    } else if (this.phase === 'in_battle') {
      statusMessage = 'Duelo em andamento — aguarde a arena liberar.';
    } else if (filled === 0) {
      statusMessage = 'Aguardando oponente no púlpito…';
    } else if (filled === 1) {
      statusMessage = 'Aguardando oponente… Ninguém mais entra enquanto a sessão estiver ativa.';
    } else if (this.bothReady()) {
      statusMessage = 'Ambos aceitaram — entrando na batalha rankeada…';
    } else {
      statusMessage = 'Os dois estão aqui — ambos devem clicar em Entrar na batalha rankeada.';
    }

    return {
      stationId: this.stationId,
      label: this.label,
      phase: this.phase,
      slots: [this.toWireSlot(this.slots[0]), this.toWireSlot(this.slots[1])],
      statusMessage,
      countdownEndsAtMs: this.countdownEndsAtMs,
      exclusive: remainingExclusive(this.phase, filled),
      matchId: this.matchId,
    };
  }

  private emit(): void {
    const snapshot = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

/** Singleton por processo Railway (um púlpito por shard). */
let rankedQueueSingleton: PvpRankedQueueManager | null = null;

export function getPvpRankedQueueManager(): PvpRankedQueueManager {
  if (!rankedQueueSingleton) {
    rankedQueueSingleton = new PvpRankedQueueManager();
  }
  return rankedQueueSingleton;
}

/** @internal testes */
export function resetPvpRankedQueueManagerForTests(): void {
  rankedQueueSingleton?.clearAfterBattle();
  rankedQueueSingleton = null;
}
