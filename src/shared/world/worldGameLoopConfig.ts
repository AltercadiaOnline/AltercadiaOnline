/** 20 Hz — 1000 / 20 = 50 ms por tick de simulação. */
export const WORLD_TICK_HZ = 20;
export const WORLD_TICK_MS = 1000 / WORLD_TICK_HZ;

/** Raio de interesse (tiles, distância de Chebyshev) para AOI / broadcasting. */
export const WORLD_INTEREST_RADIUS_TILES = 32;

/** Intervalo de flush memória → disco / Supabase. */
export const WORLD_PERSIST_INTERVAL_MS = 30_000;

/** Reenvio completo de peers a cada N ticks (reconciliação). */
export const WORLD_PEERS_FULL_RESYNC_TICKS = 20;
