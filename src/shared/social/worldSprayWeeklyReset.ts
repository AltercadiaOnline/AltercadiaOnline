/** Relógio de parede do wipe semanal de pixos — Brasil. */
export const WORLD_SPRAY_RESET_TIME_ZONE = 'America/Sao_Paulo';
/** `Date#getDay`: 0 domingo … 1 segunda. */
export const WORLD_SPRAY_RESET_WEEKDAY = 1;
export const WORLD_SPRAY_RESET_HOUR = 7;

const WEEKDAY_FROM_SHORT: Readonly<Record<string, number>> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type ZonedWall = {
  readonly weekday: number;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
};

function zonedWall(ms: number, timeZone: string): ZonedWall {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(ms)).map((part) => [part.type, part.value]),
  );
  return {
    weekday: WEEKDAY_FROM_SHORT[parts.weekday ?? 'Sun'] ?? 0,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function zonedWallToUtcMs(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): number {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const wall = zonedWall(utc, timeZone);
    const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
    const target = Date.UTC(year, month - 1, day, hour, minute, 0);
    utc += target - asUtc;
  }
  return utc;
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { readonly year: number; readonly month: number; readonly day: number } {
  const dt = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

/** Próxima segunda 07:00 em America/Sao_Paulo (se já passou, a seguinte). */
export function resolveNextWorldSprayResetAtMs(
  nowMs: number,
  timeZone: string = WORLD_SPRAY_RESET_TIME_ZONE,
): number {
  const wall = zonedWall(nowMs, timeZone);
  const todaySlot = zonedWallToUtcMs(
    timeZone,
    wall.year,
    wall.month,
    wall.day,
    WORLD_SPRAY_RESET_HOUR,
    0,
  );

  let daysUntil = (WORLD_SPRAY_RESET_WEEKDAY - wall.weekday + 7) % 7;
  if (daysUntil === 0 && nowMs >= todaySlot) {
    daysUntil = 7;
  }

  if (daysUntil === 0) {
    return todaySlot;
  }

  const nextDay = addCalendarDays(wall.year, wall.month, wall.day, daysUntil);
  return zonedWallToUtcMs(
    timeZone,
    nextDay.year,
    nextDay.month,
    nextDay.day,
    WORLD_SPRAY_RESET_HOUR,
    0,
  );
}

/** Última segunda 07:00 que já ocorreu (ou o instante exato do corte). */
export function resolveLatestElapsedWorldSprayResetAtMs(
  nowMs: number,
  timeZone: string = WORLD_SPRAY_RESET_TIME_ZONE,
): number {
  return resolveNextWorldSprayResetAtMs(nowMs, timeZone) - WEEK_MS;
}

/**
 * Catch-up: o servidor dormiu no horário do wipe.
 * Primeiro boot (`lastRunMs` nulo) **não** apaga o chão — só agenda o próximo corte.
 */
export function shouldApplyWorldSprayWeeklyReset(
  nowMs: number,
  lastRunMs: number | null,
  timeZone: string = WORLD_SPRAY_RESET_TIME_ZONE,
): boolean {
  if (lastRunMs === null) return false;
  const due = resolveLatestElapsedWorldSprayResetAtMs(nowMs, timeZone);
  return lastRunMs < due && nowMs >= due;
}
