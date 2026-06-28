export type AxisAlignedBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** Interseção AABB — usado para portal × hitbox do jogador (DESIGN_CONFIG.PLAYER). */
export function axisAlignedBoundsIntersect(
  a: AxisAlignedBounds,
  b: AxisAlignedBounds,
): boolean {
  return (
    a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
  );
}
