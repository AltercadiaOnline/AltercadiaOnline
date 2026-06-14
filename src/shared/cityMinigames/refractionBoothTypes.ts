export type RefractionBoothQuoteResult = {
  readonly ok: true;
  readonly entryCostVolts: number;
  readonly cooldownRemainingMs: number;
  readonly canAfford: boolean;
  readonly dailyPrizeRemainingVolts: number;
  readonly leaderboard: readonly RefractionBoothLeaderboardEntry[];
};

export type RefractionBoothQuoteFailed = {
  readonly ok: false;
  readonly reason: string;
};

export type RefractionBoothStarted = {
  readonly ok: true;
  readonly sessionId: string;
  readonly seed: number;
  readonly expiresAt: number;
  readonly durationMs: number;
};

export type RefractionBoothStartFailed = {
  readonly ok: false;
  readonly reason: string;
};

export type RefractionBoothCompletePayload = {
  readonly sessionId: string;
  readonly hits: number;
  readonly misses: number;
  readonly durationMs: number;
  readonly hitTimings?: readonly number[];
};

export type RefractionBoothCompleteSuccess = {
  readonly ok: true;
  readonly score: number;
  readonly prizeVolts: number;
  readonly hits: number;
  readonly misses: number;
  readonly dailyPrizeTotalVolts: number;
  readonly leaderboard: readonly RefractionBoothLeaderboardEntry[];
};

export type RefractionBoothCompleteFailed = {
  readonly ok: false;
  readonly reason: string;
};

export type RefractionBoothLeaderboardEntry = {
  readonly displayName: string;
  readonly score: number;
  readonly completedAtMs: number;
};
