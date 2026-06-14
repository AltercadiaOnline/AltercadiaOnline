/** Sem mensagens WS durante combate — libera flag BATTLE (queda sem evento close). */
export const BATTLE_SESSION_INACTIVITY_MS = 15 * 60 * 1000;

/** Duração máxima de uma batalha antes de forçar liberação do lease. */
export const BATTLE_SESSION_MAX_DURATION_MS = 45 * 60 * 1000;

/** Intervalo do sweep de leases expirados no hub WS. */
export const BATTLE_SESSION_LEASE_SWEEP_MS = 30_000;
