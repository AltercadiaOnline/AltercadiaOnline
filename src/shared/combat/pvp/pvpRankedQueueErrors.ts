/**
 * Mensagens de erro da fila PvP rankeada — front só exibe (nunca interpreta regra).
 */

import type { PvpRankedQueueErrorCode } from './pvpRankedQueueProtocol.js';

const LABELS: Readonly<Record<PvpRankedQueueErrorCode, string>> = {
  WORLD_LOGIN_REQUIRED: 'Entre no mundo antes de usar o púlpito PvP.',
  STATION_FULL: 'Púlpito ocupado — aguarde a sessão liberar.',
  ALREADY_QUEUED: 'Você já está na fila do púlpito.',
  NOT_IN_QUEUE: 'Você não está na fila — abra o púlpito de novo.',
  EXCLUSIVE_LOCKED: 'Sessão travada (countdown ou duelo). Aguarde.',
  INVALID_STATION: 'Estação PvP inválida.',
  PLAYER_BUSY: 'Personagem ocupado (já em combate ou fila).',
  MATCH_START_FAILED: 'Falha ao iniciar o duelo rankeado. Tente de novo.',
};

export function formatPvpRankedQueueError(reason: string): string {
  const label = LABELS[reason as PvpRankedQueueErrorCode];
  if (label) return label;
  return `Fila PvP: ${reason}`;
}
