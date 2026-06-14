import { randomUUID } from 'node:crypto';
import { REFRACTION_BOOTH_CONFIG } from '../../shared/cityMinigames/refractionBoothConfig.js';
import {
  clampRefractionBoothPrizeToDailyCap,
  resolveRefractionBoothPrize,
} from '../../shared/cityMinigames/refractionBoothScore.js';
import type {
  RefractionBoothCompleteFailed,
  RefractionBoothCompletePayload,
  RefractionBoothCompleteSuccess,
  RefractionBoothLeaderboardEntry,
  RefractionBoothQuoteFailed,
  RefractionBoothQuoteResult,
  RefractionBoothStartFailed,
  RefractionBoothStarted,
} from '../../shared/cityMinigames/refractionBoothTypes.js';
import {
  validateRefractionBoothComplete,
  type RefractionBoothSessionRecord,
} from '../../shared/cityMinigames/validateRefractionBoothSession.js';
import {
  creditRefractionBoothPrize,
  debitRefractionBoothEntry,
} from '../../Economy/economyGateway.js';
import { getWalletBalance } from '../../Economy/economyStore.js';

type PlayerRefractionState = {
  lastSessionEndedAtMs: number;
  dailyDayKey: string;
  dailyPrizeVolts: number;
};

function profileKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function dayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export class RefractionBoothService {
  private readonly sessions = new Map<string, RefractionBoothSessionRecord>();
  private readonly playerState = new Map<string, PlayerRefractionState>();
  private readonly leaderboard: RefractionBoothLeaderboardEntry[] = [];

  getQuote(params: {
    readonly playerId: string;
    readonly characterId: number;
    readonly nowMs?: number;
  }): RefractionBoothQuoteResult | RefractionBoothQuoteFailed {
    const nowMs = params.nowMs ?? Date.now();
    const state = this.getPlayerState(params.playerId, params.characterId, nowMs);
    const elapsedSinceLastSession =
      state.lastSessionEndedAtMs > 0 ? nowMs - state.lastSessionEndedAtMs : Number.POSITIVE_INFINITY;
    const cooldownRemainingMs = Math.max(
      0,
      REFRACTION_BOOTH_CONFIG.cooldownMs - elapsedSinceLastSession,
    );
    const wallet = getWalletBalance(params.playerId);
    const dailyPrizeRemainingVolts = Math.max(
      0,
      REFRACTION_BOOTH_CONFIG.maxDailyPrizeVolts - state.dailyPrizeVolts,
    );

    return {
      ok: true,
      entryCostVolts: REFRACTION_BOOTH_CONFIG.entryCostVolts,
      cooldownRemainingMs,
      canAfford: wallet >= REFRACTION_BOOTH_CONFIG.entryCostVolts,
      dailyPrizeRemainingVolts,
      leaderboard: this.getLeaderboard(),
    };
  }

  async startSession(params: {
    readonly playerId: string;
    readonly characterId: number;
    readonly displayName: string;
    readonly nowMs?: number;
  }): Promise<RefractionBoothStarted | RefractionBoothStartFailed> {
    const nowMs = params.nowMs ?? Date.now();
    const quote = this.getQuote(params);
    if (!quote.ok) return { ok: false, reason: quote.reason };
    if (quote.cooldownRemainingMs > 0) {
      return { ok: false, reason: 'Aguarde o cooldown do estande.' };
    }
    if (!quote.canAfford) {
      return { ok: false, reason: 'VOLTS insuficientes.' };
    }

    const debit = await debitRefractionBoothEntry({
      playerId: params.playerId,
      characterId: params.characterId,
      amountVolts: REFRACTION_BOOTH_CONFIG.entryCostVolts,
    });
    if (!debit.ok) {
      return { ok: false, reason: debit.message };
    }

    const sessionId = randomUUID();
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const expiresAt = nowMs + REFRACTION_BOOTH_CONFIG.sessionDurationMs;
    const session: RefractionBoothSessionRecord = {
      sessionId,
      playerId: params.playerId,
      characterId: params.characterId,
      displayName: params.displayName.trim() || 'Operative',
      seed,
      startedAtMs: nowMs,
      expiresAtMs: expiresAt,
      completed: false,
    };
    this.sessions.set(sessionId, session);

    return {
      ok: true,
      sessionId,
      seed,
      expiresAt,
      durationMs: REFRACTION_BOOTH_CONFIG.sessionDurationMs,
    };
  }

  async completeSession(params: {
    readonly playerId: string;
    readonly characterId: number;
    readonly payload: RefractionBoothCompletePayload;
    readonly nowMs?: number;
  }): Promise<RefractionBoothCompleteSuccess | RefractionBoothCompleteFailed> {
    const nowMs = params.nowMs ?? Date.now();
    const session = this.sessions.get(params.payload.sessionId);
    if (session && (session.playerId !== params.playerId || session.characterId !== params.characterId)) {
      return { ok: false, reason: 'Sessão inválida.' };
    }

    const validation = validateRefractionBoothComplete(session, params.payload, nowMs);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    session!.completed = true;
    const state = this.getPlayerState(params.playerId, params.characterId, nowMs);
    state.lastSessionEndedAtMs = nowMs;

    const rawPrize = resolveRefractionBoothPrize(validation.score);
    const prizeVolts = clampRefractionBoothPrizeToDailyCap(rawPrize, state.dailyPrizeVolts);

    if (prizeVolts > 0) {
      const credit = await creditRefractionBoothPrize({
        playerId: params.playerId,
        characterId: params.characterId,
        amountVolts: prizeVolts,
      });
      if (!credit.ok) {
        return { ok: false, reason: credit.message };
      }
      state.dailyPrizeVolts += prizeVolts;
    }

    this.pushLeaderboard({
      displayName: session!.displayName,
      score: validation.score,
      completedAtMs: nowMs,
    });

    return {
      ok: true,
      score: validation.score,
      prizeVolts,
      hits: validation.hits,
      misses: validation.misses,
      dailyPrizeTotalVolts: state.dailyPrizeVolts,
      leaderboard: this.getLeaderboard(),
    };
  }

  getLeaderboard(): readonly RefractionBoothLeaderboardEntry[] {
    return [...this.leaderboard];
  }

  private getPlayerState(playerId: string, characterId: number, nowMs: number): PlayerRefractionState {
    const key = profileKey(playerId, characterId);
    const currentDay = dayKey(nowMs);
    const existing = this.playerState.get(key);
    if (!existing) {
      const created: PlayerRefractionState = {
        lastSessionEndedAtMs: 0,
        dailyDayKey: currentDay,
        dailyPrizeVolts: 0,
      };
      this.playerState.set(key, created);
      return created;
    }
    if (existing.dailyDayKey !== currentDay) {
      existing.dailyDayKey = currentDay;
      existing.dailyPrizeVolts = 0;
    }
    return existing;
  }

  private pushLeaderboard(entry: RefractionBoothLeaderboardEntry): void {
    this.leaderboard.push(entry);
    this.leaderboard.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.completedAtMs - b.completedAtMs;
    });
    if (this.leaderboard.length > REFRACTION_BOOTH_CONFIG.leaderboardSize) {
      this.leaderboard.length = REFRACTION_BOOTH_CONFIG.leaderboardSize;
    }
  }
}

let sharedService: RefractionBoothService | null = null;

export function getRefractionBoothService(): RefractionBoothService {
  if (!sharedService) {
    sharedService = new RefractionBoothService();
  }
  return sharedService;
}
