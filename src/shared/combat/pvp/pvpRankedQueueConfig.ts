/**
 * Contrato da fila PvP ranqueada 1x1 no púlpito da cidade.
 *
 * Servidor: PvpRankedQueueManager + RankedPvpCombatSession.
 * Cliente: espelho via pvp-ranked-queue-snapshot (HUD React).
 */

/** Marker Construct / npcId do púlpito. */
export const PVP_RANKED_STATION_ID = 'combate_pvp';

export const PVP_RANKED_STATION_LABEL = 'PvP Rankeado';

/** Modo atual da fila no púlpito. */
export const PVP_RANKED_MODE = '1v1' as const;

/** Slots fixos da fila (1x1). */
export const PVP_RANKED_QUEUE_SLOT_COUNT = 2;

/**
 * Após ambos clicarem "Entrar na batalha rankeada", countdown destacado → tela de batalha.
 * Autoridade: servidor (`PVP_RANKED_ACCEPT_COUNTDOWN_MS`); cliente só espelha o restante.
 */
export const PVP_RANKED_ACCEPT_COUNTDOWN_MS = 10_000;

/**
 * Raio servidor para join no púlpito (tiles).
 * Um pouco mais folgado que `NPC_INTERACTION_RADIUS_TILES` (1.5) para lag de pose;
 * ainda exige estar na arena — não entra da outra ponta da cidade.
 */
export const PVP_RANKED_STATION_MAX_RANGE_TILES = 3;
