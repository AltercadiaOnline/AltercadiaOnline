/** Fase visual do ciclo — derivada do tempo autoritativo [0, 1800)s. */
export type GameDayPhase = 'night' | 'dawn' | 'day' | 'dusk';

/** Ciclo dia/noite completo — 30 minutos reais (servidor autoritativo). */
export const GAME_CYCLE_DURATION_SECONDS = 1800;
export const GAME_CYCLE_DURATION_MS = GAME_CYCLE_DURATION_SECONDS * 1000;

/** Âncora recebida do servidor — cliente interpola a partir desta referência. */
export type GameTimeAnchor = {
  /** Segundos no ciclo [0, 1800). */
  readonly gameTime: number;
  readonly serverTimeMs: number;
};

export type AmbientOverlayStyle = {
  readonly opacity: number;
  readonly backgroundColor: string;
  readonly filter: string;
};

export function normalizeGameTimeSeconds(seconds: number): number {
  const mod = seconds % GAME_CYCLE_DURATION_SECONDS;
  return mod < 0 ? mod + GAME_CYCLE_DURATION_SECONDS : mod;
}

export function gameTimeToCycleProgress(gameTimeSeconds: number): number {
  return normalizeGameTimeSeconds(gameTimeSeconds) / GAME_CYCLE_DURATION_SECONDS;
}

export function gameTimeToGameHour(gameTimeSeconds: number): number {
  return gameTimeToCycleProgress(gameTimeSeconds) * 24;
}

export function resolveGameDayPhase(gameTimeSeconds: number): GameDayPhase {
  const hour = gameTimeToGameHour(gameTimeSeconds);
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 18) return 'day';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
}

function padTimeUnit(value: number): string {
  return String(Math.floor(value)).padStart(2, '0');
}

/** Relógio digital 24h derivado do gameTime autoritativo (não usa relógio local). */
export function formatGameTimeDigital(gameTimeSeconds: number): string {
  const progress = gameTimeToCycleProgress(gameTimeSeconds);
  const virtualDaySeconds = progress * 24 * 3600;
  const hours = Math.floor(virtualDaySeconds / 3600) % 24;
  const minutes = Math.floor((virtualDaySeconds % 3600) / 60);
  const seconds = Math.floor(virtualDaySeconds % 60);
  return `${padTimeUnit(hours)}:${padTimeUnit(minutes)}:${padTimeUnit(seconds)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/** Intensidade crepuscular (laranja) perto de meia-noite, amanhecer e entardecer. */
function resolveTwilightWeight(cycleProgress: number): number {
  const bands = [0, 0.25, 0.75, 1];
  let peak = 0;
  for (const center of bands) {
    const dist = Math.min(
      Math.abs(cycleProgress - center),
      1 - Math.abs(cycleProgress - center),
    );
    const band = Math.max(0, 1 - dist / 0.09);
    peak = Math.max(peak, band);
  }
  return peak;
}

/**
 * Curva senoidal: meio-dia (900s) = dia claro; 0h/1800s = noite.
 * `gameTimeSeconds` deve ser o tempo interpolado a partir da âncora do servidor.
 */
export function resolveAmbientOverlay(gameTimeSeconds: number): AmbientOverlayStyle {
  const progress = gameTimeToCycleProgress(gameTimeSeconds);
  const darkness = (Math.cos(progress * Math.PI * 2) + 1) / 2;
  const twilight = resolveTwilightWeight(progress);

  const opacity = 0.02 + darkness * 0.1;
  const dayColor = [255, 244, 210] as const;
  const nightColor = [10, 18, 48] as const;
  const duskColor = [210, 88, 32] as const;

  const r = Math.round(lerp(dayColor[0], nightColor[0], darkness));
  const g = Math.round(lerp(dayColor[1], nightColor[1], darkness));
  const b = Math.round(lerp(dayColor[2], nightColor[2], darkness));
  const blended = twilight > 0.02
    ? `rgb(${Math.round(lerp(r, duskColor[0], twilight * 0.55))}, ${Math.round(lerp(g, duskColor[1], twilight * 0.55))}, ${Math.round(lerp(b, duskColor[2], twilight * 0.55))})`
    : `rgb(${r}, ${g}, ${b})`;

  return {
    opacity,
    backgroundColor: blended,
    filter: 'none',
  };
}

export function buildGameTimeAnchor(gameTimeSeconds: number, serverTimeMs: number): GameTimeAnchor {
  return {
    gameTime: normalizeGameTimeSeconds(gameTimeSeconds),
    serverTimeMs,
  };
}

/** Interpola segundos do ciclo a partir da âncora + relógio local (não avança tempo próprio). */
export function interpolateGameTimeSeconds(anchor: GameTimeAnchor, nowMs: number = Date.now()): number {
  const deltaSec = (nowMs - anchor.serverTimeMs) / 1000;
  return normalizeGameTimeSeconds(anchor.gameTime + deltaSec);
}

export function isGameTimeAnchor(value: unknown): value is GameTimeAnchor {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.gameTime === 'number' && Number.isFinite(record.gameTime)) {
    if (typeof record.serverTimeMs === 'number' && Number.isFinite(record.serverTimeMs)) {
      return true;
    }
  }
  return false;
}

/** Aceita número (segundos) ou âncora legada com serverTimeMs. */
export function resolveGameTimeAnchor(raw: unknown, serverTimeMs: number): GameTimeAnchor | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return buildGameTimeAnchor(raw, serverTimeMs);
  }
  if (isGameTimeAnchor(raw)) {
    return raw;
  }
  return null;
}
