import type { ZoneId } from '../items/itemTypes.js';
import {
  canEnterZone,
  evaluatePortalZoneGate,
  evaluateZoneGate,
  ZONE_GATE_MAP,
} from './ZoneGatekeeper.js';
import {
  canUsePortalWithUnlocks,
  formatPortalBypassDeniedMessage,
  getPortalRequiredUnlock,
} from './portalBypassGates.js';
import type { Portal } from './portals.js';
import { portalCenterTile } from './portals.js';

export const PORTAL_ENTER_ACCEPT_LABEL = 'Entrar';

export type PortalAccessResult =
  | { readonly ok: true; readonly zoneName: string | null }
  | { readonly ok: false; readonly reason: string };

export function resolveZoneDefinition(zoneId: ZoneId | undefined) {
  if (!zoneId) return null;
  const gate = ZONE_GATE_MAP[zoneId];
  if (!gate) return null;
  return { id: gate.id, name: gate.name, levelMin: gate.levelMin, levelMax: gate.levelMax };
}

export function getPortalZoneName(portal: Portal): string | null {
  if (!portal.targetZoneId) return null;
  return ZONE_GATE_MAP[portal.targetZoneId]?.name ?? null;
}

/**
 * Valida nível da zona e bypass de subzona.
 * `unlockedZones` vem da autoridade (servidor / mock) ou do snapshot (UX).
 * Sem lista = fail-closed nos portais com trava.
 */
export function validatePortalAccess(
  portal: Portal,
  playerLevel: number,
  unlockedZones: readonly string[] = [],
): PortalAccessResult {
  const gate = evaluatePortalZoneGate(portal, playerLevel);
  if (!gate.allowed) {
    return { ok: false, reason: gate.message };
  }
  if (!canUsePortalWithUnlocks(portal.id, unlockedZones)) {
    const required = getPortalRequiredUnlock(portal.id);
    return {
      ok: false,
      reason: formatPortalBypassDeniedMessage(required ?? 'esta subzona'),
    };
  }
  return { ok: true, zoneName: gate.zoneName };
}

export function portalReferenceTile(portal: Portal): { readonly tileX: number; readonly tileY: number } {
  const center = portalCenterTile(portal);
  return { tileX: center.x, tileY: center.y };
}

export { evaluateZoneGate, evaluatePortalZoneGate, canEnterZone };
