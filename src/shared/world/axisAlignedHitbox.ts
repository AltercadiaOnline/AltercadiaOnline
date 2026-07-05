/** Retângulo alinhado aos eixos em coordenadas de mundo (pixels). */
export type AxisAlignedHitbox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export function hitboxesOverlap(a: AxisAlignedHitbox, b: AxisAlignedHitbox): boolean {
  return (
    a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
  );
}

export function hitboxContainsPoint(
  hitbox: AxisAlignedHitbox,
  x: number,
  y: number,
): boolean {
  return (
    x >= hitbox.x
    && x < hitbox.x + hitbox.width
    && y >= hitbox.y
    && y < hitbox.y + hitbox.height
  );
}
