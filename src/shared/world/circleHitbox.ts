import type { AxisAlignedHitbox } from './axisAlignedHitbox.js';

/** Círculo de colisão — pés do personagem / props finos (postes). */
export type CircleHitbox = {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/** Centro do círculo dentro do AABB → empurra pelo eixo mais curto. */
function circleAabbMtvFromInterior(
  circle: CircleHitbox,
  box: AxisAlignedHitbox,
): { readonly dx: number; readonly dy: number } {
  const left = circle.cx - box.x;
  const right = box.x + box.width - circle.cx;
  const top = circle.cy - box.y;
  const bottom = box.y + box.height - circle.cy;
  const minDist = Math.min(left, right, top, bottom);

  if (minDist === left) return { dx: -(left + circle.radius), dy: 0 };
  if (minDist === right) return { dx: right + circle.radius, dy: 0 };
  if (minDist === top) return { dx: 0, dy: -(top + circle.radius) };
  return { dx: 0, dy: bottom + circle.radius };
}

/**
 * Vetor mínimo para separar círculo de AABB (MTV).
 * Retorna null quando não há overlap.
 */
export function resolveCircleAabbSeparation(
  circle: CircleHitbox,
  box: AxisAlignedHitbox,
): { readonly dx: number; readonly dy: number } | null {
  const closestX = clamp(circle.cx, box.x, box.x + box.width);
  const closestY = clamp(circle.cy, box.y, box.y + box.height);
  const distX = circle.cx - closestX;
  const distY = circle.cy - closestY;
  const distSq = distX * distX + distY * distY;
  const radiusSq = circle.radius * circle.radius;

  if (distSq > radiusSq) return null;

  if (distSq <= 1e-6) {
    return circleAabbMtvFromInterior(circle, box);
  }

  const dist = Math.sqrt(distSq);
  const overlap = circle.radius - dist;
  return {
    dx: (distX / dist) * overlap,
    dy: (distY / dist) * overlap,
  };
}

export function circleOverlapsAabb(circle: CircleHitbox, box: AxisAlignedHitbox): boolean {
  return resolveCircleAabbSeparation(circle, box) !== null;
}

/** Empurra o centro do círculo para fora de todos os AABBs sobrepostos. */
export function depenetrateCircleFromBoxes(
  circle: CircleHitbox,
  boxes: readonly AxisAlignedHitbox[],
  maxIterations = 4,
): CircleHitbox {
  let cx = circle.cx;
  let cy = circle.cy;
  const { radius } = circle;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let moved = false;
    for (const box of boxes) {
      const mtv = resolveCircleAabbSeparation({ cx, cy, radius }, box);
      if (!mtv) continue;
      cx += mtv.dx;
      cy += mtv.dy;
      moved = true;
    }
    if (!moved) break;
  }

  return { cx, cy, radius };
}
