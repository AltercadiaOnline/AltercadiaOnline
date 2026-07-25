import type { AxisAlignedHitbox } from './axisAlignedHitbox.js';
import type { CircleHitbox } from './circleHitbox.js';
import { circleOverlapsAabb } from './circleHitbox.js';

/** Vértice de polígono em coordenadas de mundo (pixels). */
export type PolygonVertex = {
  readonly x: number;
  readonly y: number;
};

export type PolygonHitbox = {
  readonly points: readonly PolygonVertex[];
  readonly bounds: AxisAlignedHitbox;
};

export function polygonBounds(points: readonly PolygonVertex[]): AxisAlignedHitbox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function createPolygonHitbox(points: readonly PolygonVertex[]): PolygonHitbox {
  return { points, bounds: polygonBounds(points) };
}

/** Ray-cast even-odd — ponto estritamente dentro do polígono. */
export function pointInPolygon(x: number, y: number, points: readonly PolygonVertex[]): boolean {
  const n = points.length;
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = points[i]!;
    const pj = points[j]!;
    const intersect =
      (pi.y > y) !== (pj.y > y)
      && x < ((pj.x - pi.x) * (y - pi.y)) / (pj.y - pi.y + 0) + pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

function closestPointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { readonly x: number; readonly y: number; readonly distSq: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  const t = abLenSq <= 1e-12 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  const x = ax + abx * t;
  const y = ay + aby * t;
  const dx = px - x;
  const dy = py - y;
  return { x, y, distSq: dx * dx + dy * dy };
}

function closestPointOnPolygon(
  px: number,
  py: number,
  points: readonly PolygonVertex[],
): { readonly x: number; readonly y: number; readonly distSq: number } {
  let best = { x: points[0]!.x, y: points[0]!.y, distSq: Infinity };
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    const cand = closestPointOnSegment(px, py, a.x, a.y, b.x, b.y);
    if (cand.distSq < best.distSq) best = cand;
  }
  return best;
}

/**
 * Círculo × polígono Construct (Solid).
 * Broadphase AABB → narrow: centro dentro OU distância à aresta ≤ raio.
 */
export function circleOverlapsPolygon(
  circle: CircleHitbox,
  polygon: PolygonHitbox,
): boolean {
  if (!circleOverlapsAabb(circle, polygon.bounds)) return false;
  if (pointInPolygon(circle.cx, circle.cy, polygon.points)) return true;
  const closest = closestPointOnPolygon(circle.cx, circle.cy, polygon.points);
  return closest.distSq <= circle.radius * circle.radius;
}

/**
 * MTV mínimo para separar círculo do polígono.
 * Null quando não há overlap.
 */
export function resolveCirclePolygonSeparation(
  circle: CircleHitbox,
  polygon: PolygonHitbox,
): { readonly dx: number; readonly dy: number } | null {
  if (!circleOverlapsAabb(circle, polygon.bounds)) return null;

  const inside = pointInPolygon(circle.cx, circle.cy, polygon.points);
  const closest = closestPointOnPolygon(circle.cx, circle.cy, polygon.points);
  const distSq = closest.distSq;

  if (!inside && distSq > circle.radius * circle.radius) return null;

  if (distSq <= 1e-8) {
    // Centro sobre vértice/aresta — empurra pelo centro do AABB.
    const midX = polygon.bounds.x + polygon.bounds.width / 2;
    const midY = polygon.bounds.y + polygon.bounds.height / 2;
    let nx = circle.cx - midX;
    let ny = circle.cy - midY;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    return {
      dx: nx * circle.radius,
      dy: ny * circle.radius,
    };
  }

  const dist = Math.sqrt(distSq);
  let nx = (circle.cx - closest.x) / dist;
  let ny = (circle.cy - closest.y) / dist;

  if (inside) {
    // Empurra para fora: inverte a normal (do centro para o ponto da borda).
    nx = -nx;
    ny = -ny;
    const push = dist + circle.radius;
    return { dx: nx * push, dy: ny * push };
  }

  const overlap = circle.radius - dist;
  return { dx: nx * overlap, dy: ny * overlap };
}

/** Empurra o círculo para fora de todos os polígonos sobrepostos. */
export function depenetrateCircleFromPolygons(
  circle: CircleHitbox,
  polygons: readonly PolygonHitbox[],
  maxIterations = 4,
): CircleHitbox {
  let cx = circle.cx;
  let cy = circle.cy;
  const { radius } = circle;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let moved = false;
    for (const polygon of polygons) {
      const mtv = resolveCirclePolygonSeparation({ cx, cy, radius }, polygon);
      if (!mtv) continue;
      cx += mtv.dx;
      cy += mtv.dy;
      moved = true;
    }
    if (!moved) break;
  }

  return { cx, cy, radius };
}
