/**
 * Utilitários de profundidade (Y-sort) para renderização top-down.
 * depthY maior = desenhado por cima (mais ao sul no mundo).
 */
export type WorldDepthDrawable = {
  readonly depthY: number;
  readonly draw: () => void;
};

export function sortDrawablesByDepth(
  drawables: readonly WorldDepthDrawable[],
): WorldDepthDrawable[] {
  return [...drawables].sort((a, b) => a.depthY - b.depthY);
}

export function drawDepthSorted(drawables: readonly WorldDepthDrawable[]): void {
  drawDepthSortedInPlace([...drawables]);
}

/** Ordena e desenha in-place — evita cópia extra quando o buffer é reutilizado. */
export function drawDepthSortedInPlace(drawables: WorldDepthDrawable[]): void {
  drawables.sort((a, b) => a.depthY - b.depthY);
  for (const item of drawables) {
    item.draw();
  }
}

/** Profundidade na base (sul) de um retângulo de tiles. */
export function tileFootprintDepthY(
  tileY: number,
  tileH: number,
  tileSize: number,
): number {
  return (tileY + tileH) * tileSize;
}
