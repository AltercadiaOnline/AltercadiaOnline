export type MoveVector = {
  readonly dx: number;
  readonly dy: number;
};

export type GridStep = {
  readonly stepX: -1 | 0 | 1;
  readonly stepY: -1 | 0 | 1;
};

export type CardinalInput = {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
};

const DIAGONAL_SPEED_NORMALIZER = 1 / Math.SQRT2;

function normalizeMoveVector(rawDx: number, rawDy: number): MoveVector {
  if (rawDx === 0 && rawDy === 0) {
    return { dx: 0, dy: 0 };
  }
  if (rawDx !== 0 && rawDy !== 0) {
    return {
      dx: rawDx * DIAGONAL_SPEED_NORMALIZER,
      dy: rawDy * DIAGONAL_SPEED_NORMALIZER,
    };
  }
  return { dx: rawDx === 0 ? 0 : rawDx, dy: rawDy === 0 ? 0 : rawDy };
}

/**
 * Base ortonormal do mundo em 2D (top-down).
 * - `forward` = norte / frente do personagem (= +Z no plano XZ; aqui ΔY negativo).
 * - `right`   = leste.
 *
 * Movimento por teclado usa SEMPRE `WORLD_AXIS_IDENTITY` — nunca rotação da câmera 16:9.
 */
export type WorldAxisBasis = {
  readonly forward: Readonly<{ readonly dx: number; readonly dy: number }>;
  readonly right: Readonly<{ readonly dx: number; readonly dy: number }>;
};

/** Eixos fixos do mundo — independente de viewport, letterbox ou transform da câmera. */
export const WORLD_AXIS_IDENTITY: WorldAxisBasis = {
  forward: { dx: 0, dy: -1 },
  right: { dx: 1, dy: 0 },
};

/** Cria base rotacionada (yaw) — reservado para input relativo à câmera no futuro. */
export function createWorldAxisBasis(rotationRad: number): WorldAxisBasis {
  if (!Number.isFinite(rotationRad) || Math.abs(rotationRad) < 1e-9) {
    return WORLD_AXIS_IDENTITY;
  }

  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);

  return {
    forward: {
      dx: sin,
      dy: -cos,
    },
    right: {
      dx: cos,
      dy: sin,
    },
  };
}

function readCardinalScalars(input: CardinalInput): { forward: number; right: number } {
  let forward = 0;
  let right = 0;
  if (input.up) forward += 1;
  if (input.down) forward -= 1;
  if (input.left) right -= 1;
  if (input.right) right += 1;
  return { forward, right };
}

/**
 * Converte input cardeal → vetor no espaço do mundo usando a base informada.
 * `forward` positivo = tecla cima (norte); `right` positivo = tecla direita (leste).
 */
export function composeWorldAlignedMoveVector(
  input: CardinalInput,
  basis: WorldAxisBasis = WORLD_AXIS_IDENTITY,
): MoveVector | null {
  const { forward, right } = readCardinalScalars(input);
  if (forward === 0 && right === 0) return null;

  const rawDx = right * basis.right.dx + forward * basis.forward.dx;
  const rawDy = right * basis.right.dy + forward * basis.forward.dy;
  return normalizeMoveVector(rawDx, rawDy);
}

/** Passo discreto na grade — mesma política de eixos que o vetor contínuo. */
export function composeWorldAlignedGridStep(
  input: CardinalInput,
  basis: WorldAxisBasis = WORLD_AXIS_IDENTITY,
): GridStep | null {
  const vector = composeWorldAlignedMoveVector(input, basis);
  if (!vector) return null;

  const stepX = vector.dx === 0 ? 0 : (vector.dx > 0 ? 1 : -1);
  const stepY = vector.dy === 0 ? 0 : (vector.dy > 0 ? 1 : -1);
  return { stepX: stepX as -1 | 0 | 1, stepY: stepY as -1 | 0 | 1 };
}

/**
 * WASD / setas / numpad — política Tibia: eixos do mundo, não da tela/câmera.
 * Ignora `Camera.applyTransform`, letterbox 16:9 e qualquer rotação visual futura.
 */
export function composeKeyboardMoveVector(input: CardinalInput): MoveVector | null {
  return composeWorldAlignedMoveVector(input, WORLD_AXIS_IDENTITY);
}

export function composeKeyboardGridStep(input: CardinalInput): GridStep | null {
  return composeWorldAlignedGridStep(input, WORLD_AXIS_IDENTITY);
}
