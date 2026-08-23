/**
 * Terminais de domínio da zona 1 — um POI por trava.
 * Cada terminal vive na subzona já acessível e só libera a seguinte.
 */
import {
  SUB_ZONE_TRANSITION_ORDER,
  ZONE_BYPASS_DIFFICULTIES,
  type SubZoneTransitionId,
} from '../types/zoneBypass.js';
import { WORLD_TERMINAL_IDS } from './worldTerminalCatalog.js';

export const ZONE_DOMAIN_TERMINAL_IDS = {
  /** Entrada do Beco — libera Z1A. */
  GATE_Z1: WORLD_TERMINAL_IDS.ZONE_1,
  /** Dentro de Z1A — libera Z1B. */
  GATE_Z1A: 'computador_zona1a',
  /** Dentro de Z1B — libera Z1C. */
  GATE_Z1B: 'computador_zona1b',
  /** Dentro de Z1C — libera Z1D. */
  GATE_Z1C: 'computador_zona1c',
} as const;

export type ZoneDomainTerminalId =
  (typeof ZONE_DOMAIN_TERMINAL_IDS)[keyof typeof ZONE_DOMAIN_TERMINAL_IDS];

export type ZoneDomainTerminalDefinition = {
  readonly terminalId: ZoneDomainTerminalId;
  readonly transitionId: SubZoneTransitionId;
  readonly label: string;
  /** Subzona onde o POI deve ficar (Construct). */
  readonly residesInZone: string;
  readonly dialogue: string;
};

export const ZONE_DOMAIN_TERMINAL_CATALOG: readonly ZoneDomainTerminalDefinition[] = [
  {
    terminalId: ZONE_DOMAIN_TERMINAL_IDS.GATE_Z1,
    transitionId: 'Z1_TO_Z1A',
    label: 'Terminal Zona 1 — Entrada',
    residesInZone: 'Z1',
    dialogue: 'Terminal de entrada do Beco — bypass para liberar Z1A.',
  },
  {
    terminalId: ZONE_DOMAIN_TERMINAL_IDS.GATE_Z1A,
    transitionId: 'Z1A_TO_Z1B',
    label: 'Terminal Z1A',
    residesInZone: 'Z1A',
    dialogue: 'Terminal de domínio em Z1A — bypass para liberar Z1B.',
  },
  {
    terminalId: ZONE_DOMAIN_TERMINAL_IDS.GATE_Z1B,
    transitionId: 'Z1B_TO_Z1C',
    label: 'Terminal Z1B',
    residesInZone: 'Z1B',
    dialogue: 'Terminal de domínio em Z1B — bypass para liberar Z1C.',
  },
  {
    terminalId: ZONE_DOMAIN_TERMINAL_IDS.GATE_Z1C,
    transitionId: 'Z1C_TO_Z1D',
    label: 'Terminal Z1C',
    residesInZone: 'Z1C',
    dialogue: 'Terminal de domínio em Z1C — bypass para liberar Z1D.',
  },
] as const;

const BY_TERMINAL_ID = new Map(
  ZONE_DOMAIN_TERMINAL_CATALOG.map((entry) => [entry.terminalId, entry] as const),
);

const BY_TRANSITION_ID = new Map(
  ZONE_DOMAIN_TERMINAL_CATALOG.map((entry) => [entry.transitionId, entry] as const),
);

export function isZoneDomainTerminalId(id: string): id is ZoneDomainTerminalId {
  return BY_TERMINAL_ID.has(id as ZoneDomainTerminalId);
}

export function getZoneDomainTerminalById(id: string): ZoneDomainTerminalDefinition | null {
  return BY_TERMINAL_ID.get(id as ZoneDomainTerminalId) ?? null;
}

export function getZoneDomainTerminalByTransition(
  transitionId: SubZoneTransitionId,
): ZoneDomainTerminalDefinition | null {
  return BY_TRANSITION_ID.get(transitionId) ?? null;
}

/** Zona prévia que precisa estar liberada para usar esta trava (`Z1` = entrada, sem pré-req). */
export function getZoneBypassPrerequisiteZone(transitionId: SubZoneTransitionId): string | null {
  const fromZone = ZONE_BYPASS_DIFFICULTIES[transitionId]?.fromZone;
  if (!fromZone || fromZone === 'Z1') return null;
  return fromZone;
}

export function listZoneDomainTerminalIds(): readonly ZoneDomainTerminalId[] {
  return ZONE_DOMAIN_TERMINAL_CATALOG.map((entry) => entry.terminalId);
}

/** Ordem canónica alinhada às travas. */
export function assertZoneDomainCatalogCoversTransitions(): boolean {
  return SUB_ZONE_TRANSITION_ORDER.every((id) => BY_TRANSITION_ID.has(id));
}
