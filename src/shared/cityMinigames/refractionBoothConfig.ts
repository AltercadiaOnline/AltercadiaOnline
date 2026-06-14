import { CITY_01_ID } from '../world/maps/city01.js';

/** NPC do estande — interação na frente da barraquinha. */
export const REFRACTION_BOOTH_INSTRUCTOR_NPC = 'instrutor_refraction' as const;

/** Estande de Tiro / Simulador de Refração — Cidade 01 apenas. */
export const REFRACTION_BOOTH_CONFIG = {
  mapId: CITY_01_ID,
  entryCostVolts: 50,
  sessionDurationMs: 45_000,
  cooldownMs: 120_000,
  maxHits: 80,
  minHitIntervalMs: 120,
  minSessionDurationMs: 15_000,
  /** Sessão pode encerrar antes ao atingir este limite de alvos caídos. */
  maxMisses: 15,
  earlyFailMinDurationMs: 3_000,
  maxDailyPrizeVolts: 150,
  scorePerHit: 2,
  scorePerMiss: 1,
  prizeTiers: [
    { minScore: 15, prizeVolts: 20 },
    { minScore: 8, prizeVolts: 12 },
    { minScore: 3, prizeVolts: 5 },
  ],
  leaderboardSize: 10,
} as const;

/** @deprecated Protótipo de alvos caindo — substituído por REFRACTION_BOOTH_DUCK_SPAWN. */
export const REFRACTION_BOOTH_SPAWN = {
  fallDurationMs: 2_990,
  spawnMinMs: 210,
  spawnMaxMs: 390,
  burstSpawnChance: 0.32,
  maxConcurrentTargets: 7,
} as const;

/** Spawn estilo Duck Hunt — patos saltam da base em arco parabólico (1–3 s entre spawns). */
export const REFRACTION_BOOTH_DUCK_SPAWN = {
  spawnMinMs: 1_000,
  spawnMaxMs: 3_000,
  maxConcurrentTargets: 5,
} as const;

export type RefractionBoothPrizeTier = (typeof REFRACTION_BOOTH_CONFIG.prizeTiers)[number];
