/**
 * Portais de ida das subzonas exigem bypass no terminal correspondente.
 * Retornos (ex.: Z1A → Z1) não entram — o jogador não fica preso.
 */
import { SUB_ZONE_TRANSITION_ORDER, ZONE_BYPASS_DIFFICULTIES } from '../types/zoneBypass.js';
import { getZoneDomainTerminalByTransition } from './zoneDomainTerminals.js';

/** Portal Construct → subzona que o terminal precisa ter liberado. */
export const PORTAL_BYPASS_UNLOCK_REQUIREMENT: Readonly<Record<string, string>> = {
  farm_portal_z1_to_z1a: 'Z1A',
  farm_portal_z1a_to_z1b: 'Z1B',
  farm_portal_z1a_to_z1c: 'Z1C',
};

export function getPortalRequiredUnlock(portalId: string): string | null {
  return PORTAL_BYPASS_UNLOCK_REQUIREMENT[portalId] ?? null;
}

export function formatPortalBypassDeniedMessage(requiredZone: string): string {
  const transition = SUB_ZONE_TRANSITION_ORDER.find(
    (id) => ZONE_BYPASS_DIFFICULTIES[id].toZone === requiredZone,
  );
  const terminal = transition ? getZoneDomainTerminalByTransition(transition) : null;
  if (terminal) {
    return `Decifre o ${terminal.label} para liberar ${requiredZone}.`;
  }
  return `Decifre o terminal da zona para liberar ${requiredZone}.`;
}

export function canUsePortalWithUnlocks(
  portalId: string,
  unlockedZones: readonly string[],
): boolean {
  const required = getPortalRequiredUnlock(portalId);
  if (!required) return true;
  return unlockedZones.includes(required);
}
