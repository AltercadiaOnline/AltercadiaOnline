import { WorldLoreEventKind, type WorldLoreEntry } from './worldLoreTypes.js';

/**
 * Converte entradas do log em relatos narrativos — tom de fofoca do Ancião Cael.
 */
export function narrateWorldLoreEntry(entry: WorldLoreEntry): string {
  const payload = entry.payload;

  switch (payload.kind) {
    case WorldLoreEventKind.FACTION_DOMINANCE:
      return `Ouvi dizer que a ${payload.factionName} finalmente conseguiu controlar o setor ${payload.zoneName}… e não foi sem resistência, acredite.`;
    case WorldLoreEventKind.PLAYER_ACHIEVEMENT:
      return `Dizem por aí que ${payload.playerName} ${payload.achievementLabel}. Até os mercadores pararam para ouvir.`;
    case WorldLoreEventKind.ZONE_SHIFT:
      return `Enquanto a cidade dormia, ${payload.zoneName} ${payload.detail}. Coisa rara de se ver em Altercadia.`;
    case WorldLoreEventKind.MARKET_RUMOR:
      return `Os feirantes do ${payload.districtName} cochicham que ${payload.rumor}. Eu não confirmo — só repasso o que chega aos meus ouvidos.`;
    case WorldLoreEventKind.ARENA_FEAT:
      return `Na arena, ${payload.playerName} ${payload.featLabel}. A plateia ainda comenta nas esquinas.`;
    default:
      return 'Algo mudou nas sombras da cidade… mas os detalhes se perderam no vento.';
  }
}
