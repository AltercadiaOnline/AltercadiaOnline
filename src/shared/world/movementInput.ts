import { composeKeyboardMoveVector } from './worldMovementAxis.js';

/** Vetor de movimento normalizado (cardinal ou diagonal). */
export type MoveVector = {
  readonly dx: number;
  readonly dy: number;
};

export const DIAGONAL_SPEED_NORMALIZER = 1 / Math.SQRT2;

export function normalizeMoveVector(rawDx: number, rawDy: number): MoveVector {
  if (rawDx === 0 && rawDy === 0) {
    return { dx: 0, dy: 0 };
  }
  if (rawDx !== 0 && rawDy !== 0) {
    return {
      dx: rawDx * DIAGONAL_SPEED_NORMALIZER,
      dy: rawDy * DIAGONAL_SPEED_NORMALIZER,
    };
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

  switch (code) {
    case 'KeyQ':
      return { up: true, left: true };
    case 'KeyE':
      return { up: true, right: true };
    default:
      break;
  }

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
    case 'Numpad7':
      return { up: true, left: true };
    case 'Numpad9':
      return { up: true, right: true };
    case 'Numpad1':
      return { down: true, left: true };
    case 'Numpad3':
      return { down: true, right: true };
    default:
      return null;
  }
}

export function isMovementKey(key: string, code = ''): boolean {
  return axisContributionFromKeyboard(key, code) !== null;
}

/** Q/E reservadas para diagonal — bloqueio explícito em atalhos HUD. */
export function isDedicatedDiagonalKey(code: string): boolean {
  return code === 'KeyQ' || code === 'KeyE';
}

/** Prioridade Tibia para pivot (CTRL) — cardinais apenas. */
export function resolvePivotDirection(input: CardinalInput): 'up' | 'down' | 'left' | 'right' | null {
  if (input.up) return 'up';
  if (input.down) return 'down';
  if (input.left) return 'left';
  if (input.right) return 'right';
  return null;
}
