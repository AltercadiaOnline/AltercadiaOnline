import { composeKeyboardMoveVector } from './worldMovementAxis.js';

/** Vetor de movimento — só cardinais (N/S/L/O). */
export type MoveVector = {
  readonly dx: number;
  readonly dy: number;
};

/** @deprecated Diagonal desligada — mantido por compat; sempre cardinaliza. */
export const DIAGONAL_SPEED_NORMALIZER = 1;

export function normalizeMoveVector(rawDx: number, rawDy: number): MoveVector {
  if (rawDx === 0 && rawDy === 0) {
    return { dx: 0, dy: 0 };
  }
  if (rawDx !== 0 && rawDy !== 0) {
    if (Math.abs(rawDy) >= Math.abs(rawDx)) {
      return { dx: 0, dy: rawDy > 0 ? 1 : -1 };
    }
    return { dx: rawDx > 0 ? 1 : -1, dy: 0 };
  }
  return { dx: rawDx, dy: rawDy };
}

/** Vetor contínuo para point-and-click (qualquer ângulo). */
export function normalizeWorldVector(dx: number, dy: number): MoveVector | null {
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return null;
  return { dx: dx / length, dy: dy / length };
}

export type CardinalInput = {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
};

/** Combina eixos cardeais (WASD, setas ou Numpad) em vetor unitário — eixos fixos do mundo. */
export function composeMoveVector(input: CardinalInput): MoveVector | null {
  return composeKeyboardMoveVector(input);
}

export type AxisContribution = {
  readonly up?: boolean;
  readonly down?: boolean;
  readonly left?: boolean;
  readonly right?: boolean;
};

/**
 * NumLock desligado: o SO envia `Home`/`End`/etc. em vez de `Numpad7`.
 * Normaliza para o mesmo código do numpad com NumLock ligado.
 */
export function normalizeMovementKeyCode(code: string): string {
  switch (code) {
    case 'Home':
      return 'Numpad7';
    case 'End':
      return 'Numpad1';
    case 'PageUp':
      return 'Numpad9';
    case 'PageDown':
      return 'Numpad3';
    default:
      return code;
  }
}

export function axisContributionFromKeyboard(key: string, code = ''): AxisContribution | null {
  const normalized = key.toLowerCase();

  switch (normalized) {
    case 'w':
    case 'arrowup':
      return { up: true };
    case 's':
    case 'arrowdown':
      return { down: true };
    case 'a':
    case 'arrowleft':
      return { left: true };
    case 'd':
    case 'arrowright':
      return { right: true };
    default:
      break;
  }

  switch (normalizeMovementKeyCode(code)) {
    case 'ArrowUp':
      return { up: true };
    case 'ArrowDown':
      return { down: true };
    case 'ArrowLeft':
      return { left: true };
    case 'ArrowRight':
      return { right: true };
    case 'Numpad8':
      return { up: true };
    case 'Numpad2':
      return { down: true };
    case 'Numpad4':
      return { left: true };
    case 'Numpad6':
      return { right: true };
    // Numpad diagonais → cardinal dominante (sem passo diagonal).
    case 'Numpad7':
    case 'Numpad9':
      return { up: true };
    case 'Numpad1':
    case 'Numpad3':
      return { down: true };
    default:
      return null;
  }
}

export function isMovementKey(key: string, code = ''): boolean {
  return axisContributionFromKeyboard(key, code) !== null;
}

/** Diagonal desligada — Q/E não movem o player. */
export function isDedicatedDiagonalKey(_code: string): boolean {
  return false;
}

/** Prioridade Tibia para pivot (CTRL) — cardinais apenas. */
export function resolvePivotDirection(input: CardinalInput): 'up' | 'down' | 'left' | 'right' | null {
  if (input.up) return 'up';
  if (input.down) return 'down';
  if (input.left) return 'left';
  if (input.right) return 'right';
  return null;
}
