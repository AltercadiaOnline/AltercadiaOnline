import { ZoneId, type ZoneId as ZoneIdType } from '../items/itemTypes.js';
import type { Portal } from './portals.js';
import { getMonsterZoneScalingConfig } from '../combat/monsterZoneScaling.js';

export type ZoneGateDefinition = {
  readonly id: ZoneIdType;
  readonly name: string;
  readonly levelMin: number;
  readonly levelMax: number;
};

/** Requisitos de nível por zona — gatekeeper de entrada (levelMin). levelMax espelha o motor de scaling. */
export const ZONE_GATE_MAP: Readonly<Record<ZoneIdType, ZoneGateDefinition>> = {
  [ZoneId.Zone1]: gateFromScaling(ZoneId.Zone1),
  [ZoneId.Zone2]: gateFromScaling(ZoneId.Zone2),
  [ZoneId.Zone3]: gateFromScaling(ZoneId.Zone3),
  [ZoneId.Zone4]: gateFromScaling(ZoneId.Zone4),
  [ZoneId.Zone5]: gateFromScaling(ZoneId.Zone5),
};

function gateFromScaling(zoneId: ZoneIdType): ZoneGateDefinition {
  const cfg = getMonsterZoneScalingConfig(zoneId);
  return {
    id: cfg.zoneId,
    name: cfg.name,
    levelMin: cfg.levelMin,
    levelMax: cfg.levelMax,
  };
}

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
