import { ZoneId, type ZoneId as ZoneIdType } from '../items/itemTypes.js';
import type { Portal } from './portals.js';

export type ZoneGateDefinition = {
  readonly id: ZoneIdType;
  readonly name: string;
  readonly levelMin: number;
};

/** Requisitos de nível por zona — gatekeeper central. */
export const ZONE_GATE_MAP: Readonly<Record<ZoneIdType, ZoneGateDefinition>> = {
  [ZoneId.Zone1]: { id: ZoneId.Zone1, name: 'Beco dos Fundos', levelMin: 1 },
  [ZoneId.Zone2]: { id: ZoneId.Zone2, name: 'Metrô Abandonado', levelMin: 10 },
  [ZoneId.Zone3]: { id: ZoneId.Zone3, name: 'Estacionamento', levelMin: 20 },
  [ZoneId.Zone4]: { id: ZoneId.Zone4, name: 'Telhados', levelMin: 30 },
  [ZoneId.Zone5]: { id: ZoneId.Zone5, name: 'Esgoto', levelMin: 40 },
};

export type ZoneGateResult =
  | { readonly allowed: true; readonly zoneName: string | null }
  | { readonly allowed: false; readonly requiredLevel: number; readonly message: string };

export function getZoneGateDefinition(targetZoneId: ZoneIdType): ZoneGateDefinition {
  return ZONE_GATE_MAP[targetZoneId];
}

export function getRequiredZoneLevel(targetZoneId: ZoneIdType): number {
  return ZONE_GATE_MAP[targetZoneId].levelMin;
}

export function formatZoneGateDeniedMessage(requiredLevel: number): string {
  return `Você ainda não está pronto para esta zona. Nível ${requiredLevel} necessário.`;
}

/** Verifica se o jogador pode entrar na zona de destino. */
export function canEnterZone(playerLevel: number, targetZoneId: ZoneIdType | undefined): boolean {
  if (!targetZoneId) return true;
  const safeLevel = Math.max(0, Math.floor(playerLevel));
  return safeLevel >= getRequiredZoneLevel(targetZoneId);
}

export function evaluateZoneGate(
  playerLevel: number,
  targetZoneId: ZoneIdType | undefined,
): ZoneGateResult {
  if (!targetZoneId) {
    return { allowed: true, zoneName: null };
  }

  const zone = getZoneGateDefinition(targetZoneId);
  if (canEnterZone(playerLevel, targetZoneId)) {
    return { allowed: true, zoneName: zone.name };
  }

  const requiredLevel = zone.levelMin;
  return {
    allowed: false,
    requiredLevel,
    message: formatZoneGateDeniedMessage(requiredLevel),
  };
}

export function evaluatePortalZoneGate(portal: Portal, playerLevel: number): ZoneGateResult {
  return evaluateZoneGate(playerLevel, portal.targetZoneId);
}
