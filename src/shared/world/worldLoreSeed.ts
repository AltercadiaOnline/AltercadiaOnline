import { WorldLoreEventKind, type WorldLoreEntry } from './worldLoreTypes.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Entradas demo — timestamps relativos a `now` para simular histórico vivo. */
export function createSeedWorldLoreEntries(now = Date.now()): WorldLoreEntry[] {
  return [
    {
      id: 'lore_faction_north',
      importance: 'major',
      occurredAt: now - 2 * HOUR_MS,
      payload: {
        kind: WorldLoreEventKind.FACTION_DOMINANCE,
        factionName: 'Corporação NexGrid',
        zoneName: 'Norte Industrial',
      },
    },
    {
      id: 'lore_player_rank',
      importance: 'major',
      occurredAt: now - 5 * HOUR_MS,
      payload: {
        kind: WorldLoreEventKind.PLAYER_ACHIEVEMENT,
        playerName: 'Kael Voss',
        achievementLabel: 'atingiu o rank máximo na trilha de combate urbano',
      },
    },
    {
      id: 'lore_zone_plaza',
      importance: 'notable',
      occurredAt: now - 9 * HOUR_MS,
      payload: {
        kind: WorldLoreEventKind.ZONE_SHIFT,
        zoneName: 'a Praça Central',
        detail: 'ganhou novos postos de mercado e a guarda reforçou o perímetro',
      },
    },
    {
      id: 'lore_market_volts',
      importance: 'minor',
      occurredAt: now - 14 * HOUR_MS,
      payload: {
        kind: WorldLoreEventKind.MARKET_RUMOR,
        districtName: 'Bairro Comercial Leste',
        rumor: 'o fluxo de VOLTS triplicou depois de uma leva de contratos na arena',
      },
    },
    {
      id: 'lore_arena_streak',
      importance: 'notable',
      occurredAt: now - 28 * HOUR_MS,
      payload: {
        kind: WorldLoreEventKind.ARENA_FEAT,
        playerName: 'Mira Solano',
        featLabel: 'venceu dez duelos seguidos sem recuar um tile',
      },
    },
    {
      id: 'lore_faction_alley',
      importance: 'major',
      occurredAt: now - 2 * DAY_MS,
      payload: {
        kind: WorldLoreEventKind.FACTION_DOMINANCE,
        factionName: 'Sindicato das Oficinas',
        zoneName: 'Beco dos Fundos (extensão urbana)',
      },
    },
    {
      id: 'lore_market_alter',
      importance: 'minor',
      occurredAt: now - 3 * DAY_MS,
      payload: {
        kind: WorldLoreEventKind.MARKET_RUMOR,
        districtName: 'Feira da Altercadia',
        rumor: 'comerciantes estrangeiros passaram a aceitar ALTER COINS em negociações discretas',
      },
    },
    {
      id: 'lore_player_marco',
      importance: 'notable',
      occurredAt: now - 4 * DAY_MS,
      payload: {
        kind: WorldLoreEventKind.PLAYER_ACHIEVEMENT,
        playerName: 'Operative',
        achievementLabel: 'desbloqueou um marco raro na árvore de habilidades',
      },
    },
  ];
}
