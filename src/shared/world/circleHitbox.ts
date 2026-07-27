import type { AxisAlignedHitbox } from './axisAlignedHitbox.js';

/** Círculo de colisão — pés do personagem / props finos (postes). */
export type CircleHitbox = {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
};

export type CircleSeparationOptions = {
  /** Penetração ≤ slop não conta (slide flush sem “grudar”). */
  readonly slopPx?: number;
  /** Empurra até radius+skin (evita re-penetrar no próximo substep). */
  readonly skinPx?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/** Centro do círculo dentro do AABB → empurra pelo eixo mais curto. */
function circleAabbMtvFromInterior(
  circle: CircleHitbox,
  box: AxisAlignedHitbox,
  separationRadius: number,
): { readonly dx: number; readonly dy: number } {
  const left = circle.cx - box.x;
  const right = box.x + box.width - circle.cx;
  const top = circle.cy - box.y;
  const bottom = box.y + box.height - circle.cy;
  const minDist = Math.min(left, right, top, bottom);

  if (minDist === left) return { dx: -(left + separationRadius), dy: 0 };
  if (minDist === right) return { dx: right + separationRadius, dy: 0 };
  if (minDist === top) return { dx: 0, dy: -(top + separationRadius) };
  return { dx: 0, dy: bottom + separationRadius };
}

/**
 * Vetor mínimo para separar círculo de AABB (MTV).
 * Retorna null quando não há overlap (ou só contato raso ≤ slop).
 */
export function resolveCircleAabbSeparation(
  circle: CircleHitbox,
  box: AxisAlignedHitbox,
  options: CircleSeparationOptions = {},
): { readonly dx: number; readonly dy: number } | null {
  const slopPx = Math.max(0, options.slopPx ?? 0);
  const skinPx = Math.max(0, options.skinPx ?? 0);
  const separationRadius = circle.radius + skinPx;

  const closestX = clamp(circle.cx, box.x, box.x + box.width);
  const closestY = clamp(circle.cy, box.y, box.y + box.height);
  const distX = circle.cx - closestX;
  const distY = circle.cy - closestY;
  const distSq = distX * distX + distY * distY;
  const radiusSq = circle.radius * circle.radius;

  if (distSq > radiusSq) return null;

  if (distSq <= 1e-6) {
    return circleAabbMtvFromInterior(circle, box, separationRadius);
  }

  const dist = Math.sqrt(distSq);
  const penetration = circle.radius - dist;
  if (penetration <= slopPx) return null;

  const push = separationRadius - dist;
  return {
    dx: (distX / dist) * push,
    dy: (distY / dist) * push,
  };
}

export function circleOverlapsAabb(
  circle: CircleHitbox,
  box: AxisAlignedHitbox,
  options: CircleSeparationOptions = {},
): boolean {
  return resolveCircleAabbSeparation(circle, box, options) !== null;
}

/** Broadphase inclusivo (contato raso conta) — não usa slop de gameplay. */
export function circleMayHitAabb(circle: CircleHitbox, box: AxisAlignedHitbox): boolean {
  const closestX = clamp(circle.cx, box.x, box.x + box.width);
  const closestY = clamp(circle.cy, box.y, box.y + box.height);
  const distX = circle.cx - closestX;
  const distY = circle.cy - closestY;
  return distX * distX + distY * distY <= circle.radius * circle.radius;
}

/** Empurra o centro do círculo para fora de todos os AABBs sobrepostos. */
export function depenetrateCircleFromBoxes(
  circle: CircleHitbox,
  boxes: readonly AxisAlignedHitbox[],
  maxIterations = 4,
  options: CircleSeparationOptions = {},
): CircleHitbox {
  let cx = circle.cx;
  let cy = circle.cy;
  const { radius } = circle;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let moved = false;
    for (const box of boxes) {
      const mtv = resolveCircleAabbSeparation({ cx, cy, radius }, box, options);
      if (!mtv) continue;
      cx += mtv.dx;
      cy += mtv.dy;
      moved = true;
    }
    if (!moved) break;
  }

  return { cx, cy, radius };
}
