/**
 * Tipos e configurações para a mecânica de Bypass de Zona (Escalonamento de Memória)
 */

export type SubZoneTransitionId = 'Z1_TO_Z1A' | 'Z1A_TO_Z1B' | 'Z1B_TO_Z1C' | 'Z1C_TO_Z1D';

export interface ZoneBypassDifficultyConfig {
  readonly transitionId: SubZoneTransitionId;
  readonly fromZone: string;
  readonly toZone: string;
  readonly digitCount: number;
  readonly displayTimeMs: number; // Ex: 3000ms
  readonly timeLimitMs: number;   // Tempo limite para o envio da resposta
}

export const ZONE_BYPASS_DIFFICULTIES: Record<SubZoneTransitionId, ZoneBypassDifficultyConfig> = {
  Z1_TO_Z1A: {
    transitionId: 'Z1_TO_Z1A',
    fromZone: 'Z1',
    toZone: 'Z1A',
    digitCount: 4,
    displayTimeMs: 3000,
    timeLimitMs: 10000,
  },
  Z1A_TO_Z1B: {
    transitionId: 'Z1A_TO_Z1B',
    fromZone: 'Z1A',
    toZone: 'Z1B',
    digitCount: 6,
    displayTimeMs: 3000,
    timeLimitMs: 12000,
  },
  Z1B_TO_Z1C: {
    transitionId: 'Z1B_TO_Z1C',
    fromZone: 'Z1B',
    toZone: 'Z1C',
    digitCount: 8,
    displayTimeMs: 3000,
    timeLimitMs: 15000,
  },
  Z1C_TO_Z1D: {
    transitionId: 'Z1C_TO_Z1D',
    fromZone: 'Z1C',
    toZone: 'Z1D',
    digitCount: 12,
    displayTimeMs: 3000,
    timeLimitMs: 20000,
  },
};

export interface TerminalInitRequest {
  readonly userId: string;
  readonly transitionId: SubZoneTransitionId;
}

export interface TerminalInitResponse {
  readonly sessionId: string;
  readonly transitionId: SubZoneTransitionId;
  readonly digitCount: number;
  readonly displayTimeMs: number;
  readonly timeLimitMs: number;
  readonly isAlreadyUnlocked: boolean;
  /** Apenas fornecido ao cliente se for o início legítimo do minigame */
  readonly sequencePreview?: string;
}

export interface TerminalSubmitRequest {
  readonly sessionId: string;
  readonly userId: string;
  readonly inputCode: string;
}

export interface TerminalSubmitResponse {
  readonly success: boolean;
  readonly alreadyUnlocked?: boolean;
  readonly expGained?: number;
  readonly nextZoneUnlocked?: string;
  readonly lockdownDurationMs?: number;
  readonly errorMessage?: string;
}

export interface PlayerZoneUnlocks {
  readonly userId: string;
  readonly unlockedZones: string[]; // Lista de IDs de zonas desbloqueadas (ex: ['Z1A', 'Z1B'])
}
