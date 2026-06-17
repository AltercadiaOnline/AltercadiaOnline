import type { PlayerWorldVitals } from '../character/equipmentState.js';
import { clampPlayerHpCurrent } from '../character/playerVitals.js';

function clampMpCurrent(mpCurrent: number, mpMax: number): number {
  return Math.max(0, Math.min(mpMax, Math.floor(mpCurrent)));
}

function sanitizeVitals(vitals: PlayerWorldVitals): PlayerWorldVitals | null {
  const { hpCurrent, hpMax, mpCurrent, mpMax } = vitals;
  if (
    !Number.isFinite(hpCurrent)
    || !Number.isFinite(hpMax)
    || !Number.isFinite(mpCurrent)
    || !Number.isFinite(mpMax)
    || hpMax < 1
    || mpMax < 1
  ) {
    return null;
  }

  const safeHpMax = Math.max(1, Math.floor(hpMax));
  const safeMpMax = Math.max(1, Math.floor(mpMax));
  return {
    hpMax: safeHpMax,
    mpMax: safeMpMax,
    hpCurrent: clampPlayerHpCurrent(hpCurrent, safeHpMax),
    mpCurrent: clampMpCurrent(mpCurrent, safeMpMax),
  };
}

/**
 * Mescla vitals do servidor com espelho do cliente para validar cura.
 * Usa o menor HP/MP atual — evita rejeitar cura quando o servidor ficou desatualizado pós-batalha.
 */
export function mergeVitalsForHealCheck(
  serverVitals: PlayerWorldVitals,
  clientVitals?: PlayerWorldVitals | null,
): PlayerWorldVitals {
  const server = sanitizeVitals(serverVitals);
  if (!server) {
    return serverVitals;
  }

  const client = clientVitals ? sanitizeVitals(clientVitals) : null;
  if (!client) {
    return server;
  }

  const hpMax = Math.max(server.hpMax, client.hpMax);
  const mpMax = Math.max(server.mpMax, client.mpMax);

  return {
    hpMax,
    mpMax,
    hpCurrent: Math.min(
      clampPlayerHpCurrent(server.hpCurrent, hpMax),
      clampPlayerHpCurrent(client.hpCurrent, hpMax),
    ),
    mpCurrent: Math.min(
      clampMpCurrent(server.mpCurrent, mpMax),
      clampMpCurrent(client.mpCurrent, mpMax),
    ),
  };
}
