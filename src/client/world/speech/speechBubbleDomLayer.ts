import {
  GAME_STAGE_FRAME_ID,
  SPEECH_BUBBLES_LAYER_ID,
} from '../../layout/gameLayout.js';
import type { Camera } from '../../scenes/Camera.js';
import { toDomOverlayCoords, toScreenCoords } from '../screenCoords.js';
import { NAMETAG_VIEWPORT_MARGIN_PX } from '../nametagRenderer.js';
import { SPEECH_BUBBLE_OFFSET_X_PX } from '../../../shared/world/speechBubbleConstants.js';
import type { SpeechBubble } from './SpeechBubble.js';

export type SpeechBubbleDomEntry = {
  readonly id: string;
  readonly bubble: SpeechBubble;
};

const bubblePool = new Map<string, HTMLDivElement>();

const EST_BUBBLE_WIDTH_PX = 148;
const EST_BUBBLE_HEIGHT_PX = 44;

function resolveSpeechBubbleLayer(root: ParentNode = document): HTMLElement | null {
  const frame = root.querySelector<HTMLElement>(`#${GAME_STAGE_FRAME_ID}`);
  if (!frame) return null;
  return frame.querySelector<HTMLElement>(`#${SPEECH_BUBBLES_LAYER_ID}`);
}

function isBubbleInViewport(
  camera: Camera,
  worldX: number,
  worldY: number,
): boolean {
  const margin = NAMETAG_VIEWPORT_MARGIN_PX;
  const minX = camera.x - margin;
  const minY = camera.y - margin;
  const maxX = camera.x + camera.visibleWorldWidth + margin;
  const maxY = camera.y + camera.visibleWorldHeight + margin;
  const left = worldX - EST_BUBBLE_WIDTH_PX / 2;
  const top = worldY - EST_BUBBLE_HEIGHT_PX;
  return left <= maxX && left + EST_BUBBLE_WIDTH_PX >= minX && top <= maxY && top + EST_BUBBLE_HEIGHT_PX >= minY;
}

/**
 * Balões em DOM — fora do transform:scale do canvas; texto nítido como nametags.
 */
export function syncDomSpeechBubbles(
  entries: readonly SpeechBubbleDomEntry[],
  camera: Camera,
  now = Date.now(),
  root: ParentNode = document,
): void {
  const layer = resolveSpeechBubbleLayer(root);
  if (!layer) return;

  const visibleIds = new Set<string>();

  for (const { id, bubble } of entries) {
    const alpha = bubble.getAlpha(now);
    if (alpha <= 0) continue;

    const worldX = bubble.worldX + SPEECH_BUBBLE_OFFSET_X_PX;
    const worldY = bubble.drawAnchorY;
    if (!isBubbleInViewport(camera, worldX, worldY)) continue;

    visibleIds.add(id);

    const { screenX, screenY } = toScreenCoords(camera, worldX, worldY);
    const { left, top } = toDomOverlayCoords(screenX, screenY, root);

    let el = bubblePool.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'speech-bubble-tag';
      el.dataset.bubbleId = id;
      bubblePool.set(id, el);
      layer.appendChild(el);
    } else if (el.parentElement !== layer) {
      layer.appendChild(el);
    }

    if (el.textContent !== bubble.text) {
      el.textContent = bubble.text;
    }

    const leftPx = `${left}px`;
    const topPx = `${top}px`;
    if (el.style.left !== leftPx) el.style.left = leftPx;
    if (el.style.top !== topPx) el.style.top = topPx;

    const opacity = alpha.toFixed(2);
    if (el.style.opacity !== opacity) el.style.opacity = opacity;
  }

  for (const [id, el] of bubblePool) {
    if (visibleIds.has(id)) continue;
    el.remove();
    bubblePool.delete(id);
  }
}

export function clearDomSpeechBubbles(root: ParentNode = document): void {
  const layer = root.querySelector<HTMLElement>(`#${SPEECH_BUBBLES_LAYER_ID}`);
  if (layer) layer.replaceChildren();
  bubblePool.clear();
}
