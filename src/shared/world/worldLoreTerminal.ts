import { WorldLoreEventKind, type WorldLoreEntry } from './worldLoreTypes.js';

/** Formata entrada de lore em linha compacta estilo terminal da Ficha do Operativo. */
export function formatOperativeTerminalEvent(entry: WorldLoreEntry): string {
  const payload = entry.payload;

  switch (payload.kind) {
    case WorldLoreEventKind.ARENA_FEAT:
      return `Torneio Arena: ${payload.featLabel}`;
    case WorldLoreEventKind.PLAYER_ACHIEVEMENT:
      return `${payload.playerName}: ${payload.achievementLabel}`;
    case WorldLoreEventKind.ZONE_SHIFT:
      return `Zona ${payload.zoneName}: ${payload.detail}`;
    case WorldLoreEventKind.FACTION_DOMINANCE:
      return `Domínio ${payload.factionName}: ${payload.zoneName}`;
    case WorldLoreEventKind.MARKET_RUMOR:
      return `Mercado ${payload.districtName}: ${payload.rumor}`;
    default:
      return 'Evento registrado no terminal.';
  }
}

export function formatOperativeEventTimestamp(occurredAt: number, now = Date.now()): string {
  const date = new Date(occurredAt);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (now - occurredAt < 86_400_000) {
    return `${hours}:${minutes}`;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
}

/** Últimas grandes ações — ignora rumores menores. */
export function selectOperativeEventEntries(
  entries: readonly WorldLoreEntry[],
  maxLines = 3,
): readonly WorldLoreEntry[] {
  return entries
    .filter((entry) => entry.importance === 'major' || entry.importance === 'notable')
    .slice(0, maxLines);
}
