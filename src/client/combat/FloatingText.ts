import { mountBattleEffectBesideFighter } from './battleEffectsLayer.js';

export type FloatingTextPosition = {
  readonly x: number;
  readonly y: number;
};

export const FLOATING_TEXT_DURATION_MS = 1000;

/** Número de dano na camada da arena — sobe e some via CSS. */
export function showFloatingText(
  amount: number,
  position: FloatingTextPosition,
  doc: Document = document,
  anchor?: HTMLElement,
): void {
  const div = doc.createElement('div');
  div.innerText = `-${Math.max(0, Math.round(amount))}`;
  div.className = 'damage-number damage-number--scene';
  div.setAttribute('aria-hidden', 'true');

  if (anchor) {
    mountBattleEffectBesideFighter(div, anchor, { gapPx: 14 });
  } else {
    div.style.position = 'fixed';
    div.style.left = `${position.x}px`;
    div.style.top = `${position.y}px`;
    div.style.transform = 'translate(-50%, 0)';
    div.style.zIndex = '12000';
    doc.body.appendChild(div);
  }

  setTimeout(() => div.remove(), FLOATING_TEXT_DURATION_MS);
}

/** Posiciona o dano sobre o centro-superior do retrato (coordenadas relativas à arena). */
export function showFloatingTextAtElement(amount: number, anchor: HTMLElement): void {
  showFloatingText(amount, { x: 0.5, y: 0.44 }, anchor.ownerDocument, anchor);
}
