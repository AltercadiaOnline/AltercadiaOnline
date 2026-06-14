import { toDomOverlayCoords } from './screenCoords.js';

/**
 * Posiciona elemento DOM na camada de overlay (fora do transform: scale).
 * bufferX/bufferY = coordenadas do buffer 640×360 (toScreenCoords).
 */
export function positionElementAtBufferPoint(
  element: HTMLElement,
  bufferX: number,
  bufferY: number,
  root: ParentNode = document,
): void {
  const { left, top } = toDomOverlayCoords(bufferX, bufferY, root);
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
}
