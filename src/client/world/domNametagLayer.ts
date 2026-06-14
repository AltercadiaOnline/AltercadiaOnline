import {

  GAME_RENDER_HEIGHT,

  GAME_RENDER_WIDTH,

  GAME_STAGE_FRAME_ID,

  GAME_STAGE_SCALE_ID,

  NPC_NAMES_LAYER_ID,

} from '../layout/gameLayout.js';

import type { Camera } from '../scenes/Camera.js';

import {

  formatNametagLabel,

  getNametagDrawY,

  NAMETAG_VIEWPORT_MARGIN_PX,

  type NametagAnchor,

} from './nametagRenderer.js';

import { resolveNametagScreenPosition } from './nametagScreenCoords.js';



export type DomLabelPlacement = 'above' | 'center';



export type DomNametagEntry = {

  readonly id: string;

  readonly label: string;

  readonly anchor: NametagAnchor;

  readonly className?: string;

  readonly placement?: DomLabelPlacement;

};



const tagPool = new Map<string, HTMLSpanElement>();

let cachedHostRect: DOMRect | null = null;

let cachedFrameRect: DOMRect | null = null;



/**
 * Camada HTML — irmã de #game-stage-scale, sem transform: scale().
 * Ponto de entrada documentado: worldDomOverlay.syncWorldDomOverlay.
 */

export function resolveDomNametagLayer(root: ParentNode = document): HTMLElement | null {

  const frame = root.querySelector<HTMLElement>(`#${GAME_STAGE_FRAME_ID}`);

  if (!frame) return null;



  let layer = frame.querySelector<HTMLElement>(`#${NPC_NAMES_LAYER_ID}`);

  if (!layer) {

    layer = document.createElement('div');

    layer.id = NPC_NAMES_LAYER_ID;

    layer.className = 'npc-names-layer';

    layer.setAttribute('aria-hidden', 'true');

    const scaleHost = frame.querySelector(`#${GAME_STAGE_SCALE_ID}`);

    if (scaleHost?.nextSibling) {

      frame.insertBefore(layer, scaleHost.nextSibling);

    } else {

      frame.appendChild(layer);

    }

  }



  return layer;

}



/** Invalida cache de layout — chamar no resize do viewport (não a cada frame). */

export function invalidateDomNametagLayoutCache(): void {

  cachedHostRect = null;

  cachedFrameRect = null;

}



/** Mapeia ponto do buffer 640×360 → px relativos ao #game-stage-frame. */

export function mapBufferPointToFramePx(

  bufferX: number,

  bufferY: number,

  hostRect: DOMRect,

  frameRect: DOMRect,

): { readonly left: number; readonly top: number } {

  if (hostRect.width <= 0 || hostRect.height <= 0) {

    return { left: 0, top: 0 };

  }



  const left = hostRect.left - frameRect.left + (bufferX / GAME_RENDER_WIDTH) * hostRect.width;

  const top = hostRect.top - frameRect.top + (bufferY / GAME_RENDER_HEIGHT) * hostRect.height;



  return {

    left: Math.round(left),

    top: Math.round(top),

  };

}



export function clearDomNametags(root: ParentNode = document): void {

  const layer = resolveDomNametagLayer(root);

  if (layer) layer.replaceChildren();

  tagPool.clear();

  invalidateDomNametagLayoutCache();

}



function resolveBufferPoint(

  entry: DomNametagEntry,

  camera: Camera,

): { readonly x: number; readonly y: number } {

  const { worldX, anchorTopY } = entry.anchor;

  const placement = entry.placement ?? 'above';

  const worldY = placement === 'center' ? anchorTopY : getNametagDrawY(anchorTopY);

  return resolveNametagScreenPosition(camera, worldX, worldY);

}



function isDomLabelInViewport(entry: DomNametagEntry, camera: Camera): boolean {

  const { worldX, anchorTopY } = entry.anchor;

  const marginPx = NAMETAG_VIEWPORT_MARGIN_PX;

  const minX = camera.x - marginPx;

  const minY = camera.y - marginPx;

  const maxX = camera.x + camera.visibleWorldWidth + marginPx;

  const maxY = camera.y + camera.visibleWorldHeight + marginPx;

  const placement = entry.placement ?? 'above';

  const labelY = placement === 'center' ? anchorTopY : getNametagDrawY(anchorTopY);

  return worldX >= minX && worldX <= maxX && labelY >= minY && labelY <= maxY;

}



function readLayoutRects(

  frame: HTMLElement,

  scaleHost: HTMLElement,

): { readonly hostRect: DOMRect; readonly frameRect: DOMRect } {

  if (!cachedHostRect || !cachedFrameRect) {

    cachedHostRect = scaleHost.getBoundingClientRect();

    cachedFrameRect = frame.getBoundingClientRect();

  }

  return { hostRect: cachedHostRect, frameRect: cachedFrameRect };

}



function applyTagElement(

  el: HTMLSpanElement,

  entry: DomNametagEntry,

  left: number,

  top: number,

): void {

  const className = entry.className ?? 'npc-name-tag';

  if (el.className !== className) el.className = className;

  if (el.textContent !== entry.label) el.textContent = entry.label;

  const leftPx = `${left}px`;

  const topPx = `${top}px`;

  if (el.style.left !== leftPx) el.style.left = leftPx;

  if (el.style.top !== topPx) el.style.top = topPx;

  if (entry.placement === 'center') {

    if (el.dataset.labelPlacement !== 'center') el.dataset.labelPlacement = 'center';

  } else if (el.dataset.labelPlacement) {

    delete el.dataset.labelPlacement;

  }

}



/** Sincroniza textos do mundo em DOM — reutiliza nós e evita layout reads por frame. */

export function syncDomNametags(

  entries: readonly DomNametagEntry[],

  camera: Camera,

  root: ParentNode = document,

): void {

  const layer = resolveDomNametagLayer(root);

  const frame = root.querySelector<HTMLElement>(`#${GAME_STAGE_FRAME_ID}`);

  const scaleHost = root.querySelector<HTMLElement>(`#${GAME_STAGE_SCALE_ID}`);

  if (!layer || !frame || !scaleHost) return;



  const { hostRect, frameRect } = readLayoutRects(frame, scaleHost);

  const visibleIds = new Set<string>();



  for (const entry of entries) {

    if (!isDomLabelInViewport(entry, camera)) continue;



    visibleIds.add(entry.id);

    const buffer = resolveBufferPoint(entry, camera);

    const { left, top } = mapBufferPointToFramePx(buffer.x, buffer.y, hostRect, frameRect);



    let el = tagPool.get(entry.id);

    if (!el) {

      el = document.createElement('span');

      el.dataset.nametagId = entry.id;

      tagPool.set(entry.id, el);

      layer.appendChild(el);

    } else if (el.parentElement !== layer) {

      layer.appendChild(el);

    }



    applyTagElement(el, entry, left, top);

  }



  for (const [id, el] of tagPool) {

    if (visibleIds.has(id)) continue;

    el.remove();

    tagPool.delete(id);

  }

}



export function formatNpcDomNametag(name: string, level: number): string {

  return formatNametagLabel(name, level);

}


