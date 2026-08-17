/**
 * Tipos e configurações para a mecânica de Bypass de Zona (Escalonamento de Memória)
 */

export type SubZoneTransitionId = 'Z1_TO_Z1A' | 'Z1A_TO_Z1B' | 'Z1B_TO_Z1C' | 'Z1C_TO_Z1D';

export const SUB_ZONE_TRANSITION_ORDER: readonly SubZoneTransitionId[] = [
  'Z1_TO_Z1A',
  'Z1A_TO_Z1B',
  'Z1B_TO_Z1C',
  'Z1C_TO_Z1D',
] as const;

/** Janela em que o código real aparece — sempre embaralhado, nunca estático. */
export const ZONE_BYPASS_DISPLAY_MS = 2000;

export interface ZoneBypassDifficultyConfig {
  readonly transitionId: SubZoneTransitionId;
  readonly fromZone: string;
  readonly toZone: string;
  readonly digitCount: number;
  readonly displayTimeMs: number;
  readonly timeLimitMs: number;
}

export const ZONE_BYPASS_DIFFICULTIES: Record<SubZoneTransitionId, ZoneBypassDifficultyConfig> = {
  Z1_TO_Z1A: {
    transitionId: 'Z1_TO_Z1A',
    fromZone: 'Z1',
    toZone: 'Z1A',
    digitCount: 4,
    displayTimeMs: ZONE_BYPASS_DISPLAY_MS,
    timeLimitMs: 10000,
  },
  Z1A_TO_Z1B: {
    transitionId: 'Z1A_TO_Z1B',
    fromZone: 'Z1A',
    toZone: 'Z1B',
    digitCount: 6,
    displayTimeMs: ZONE_BYPASS_DISPLAY_MS,
    timeLimitMs: 12000,
  },
  Z1B_TO_Z1C: {
    transitionId: 'Z1B_TO_Z1C',
    fromZone: 'Z1B',
    toZone: 'Z1C',
    digitCount: 8,
    displayTimeMs: ZONE_BYPASS_DISPLAY_MS,
    timeLimitMs: 15000,
  },
  Z1C_TO_Z1D: {
    transitionId: 'Z1C_TO_Z1D',
    fromZone: 'Z1C',
    toZone: 'Z1D',
    digitCount: 12,
    displayTimeMs: ZONE_BYPASS_DISPLAY_MS,
    timeLimitMs: 20000,
  },
};

/**
 * Glifo na fase de memorizar: scramble nas pontas, código real no miolo com glitch.
 * `noiseDigit` já vem sorteado (0–9); o cliente não decide o segredo.
 */
export function resolveScrambledMemorizeDigit(
  realDigit: string,
  elapsedMs: number,
  displayTimeMs: number,
  glitchRoll: number,
  noiseDigit: string,
): string {
  if (displayTimeMs <= 0) return realDigit;
  const t = elapsedMs / displayTimeMs;
  const inReveal = t >= 0.22 && t < 0.82;
  if (inReveal && glitchRoll > 0.22) return realDigit;
  return noiseDigit;
}

export function scrambleMemorizeSequence(
  secret: string,
  elapsedMs: number,
  displayTimeMs: number,
  random: () => number = Math.random,
): string {
  let out = '';
  for (let i = 0; i < secret.length; i += 1) {
    const real = secret[i] ?? '0';
    const noise = String(Math.floor(random() * 10) % 10);
    out += resolveScrambledMemorizeDigit(real, elapsedMs, displayTimeMs, random(), noise);
  }
  return out;
}

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
  readonly unlockedZones: string[];
}

export interface ZoneDomainLane {
  readonly transitionId: SubZoneTransitionId;
  readonly fromZone: string;
  readonly toZone: string;
  readonly digitCount: number;
  readonly displayTimeMs: number;
  readonly unlocked: boolean;
  readonly holderName: string | null;
}

export interface ZoneDomainSnapshot {
  readonly unlockedZones: readonly string[];
  readonly lanes: readonly ZoneDomainLane[];
  readonly nextTransitionId: SubZoneTransitionId | null;
  readonly lockdownRemainingMs: number;
}
