import type { Camera } from '../scenes/Camera.js';
import { warnLegacyRenderCall } from '../render/legacyRenderWarnings.js';
import { resolveNametagScreenPosition } from './nametagScreenCoords.js';
import { resolvePlayerSpriteDimensions, resolvePlayerVisualBounds } from '../../shared/world/playerVisualContract.js';
import type { WorldPoint } from '../../shared/world/playerEntity.js';
import { getPlayerProfileStore } from '../ui/character/playerProfileStore.js';

/** Fonte em px inteiro — desenhada em espaço de viewport (sem transform da câmera). */
export const NAMETAG_FONT = 'bold 11px "Courier New", "Consolas", monospace';
export const NAMETAG_FONT_SIZE_PX = 11;

/**
 * Distância acima do topo visual do sprite (~cabeça) em px mundo.
 * Proporcional à altura ~2 tiles para não flutuar nem sobrepor a cabeça.
 */
export function resolveNametagOffsetAboveHeadPx(): number {
  return Math.round(resolvePlayerSpriteDimensions().height * 0.05) + 6;
}

/** @deprecated Use resolveNametagOffsetAboveHeadPx() — valor dinâmico por mapa. */
export const NAMETAG_OFFSET_ABOVE_HEAD_PX = resolveNametagOffsetAboveHeadPx();

/** @deprecated Use NAMETAG_OFFSET_ABOVE_HEAD_PX */
export const NAMETAG_OFFSET_ABOVE_SPRITE_PX = NAMETAG_OFFSET_ABOVE_HEAD_PX;

/** Margem extra além da viewport para culling (evita pop-in). */
export const NAMETAG_VIEWPORT_MARGIN_PX = 64;

export type NametagView = {
  readonly name: string;
  readonly level: number;
};

export type NametagAnchor = {
  readonly worldX: number;
  readonly anchorTopY: number;
};

export function renderNameTag(playerName: string, playerLevel: number): string {
  return `${playerName} (Nível: ${playerLevel})`;
}

export function formatNametagLabel(name: string, level: number): string {
  return renderNameTag(name, level);
}

/** Lê nome e nível do perfil global — atualiza a cada frame ou após PLAYER_PROFILE_UPDATED. */
export function resolvePlayerNametagView(): NametagView {
  const profile = getPlayerProfileStore().getSnapshot();
  return {
    name: profile.displayName,
    level: profile.level,
  };
}

export function getNametagDrawY(anchorTopY: number): number {
  return anchorTopY - resolveNametagOffsetAboveHeadPx();
}

export function isNametagInViewport(
  camera: Camera,
  worldX: number,
  anchorTopY: number,
  marginPx = NAMETAG_VIEWPORT_MARGIN_PX,
): boolean {
  const minX = camera.x - marginPx;
  const minY = camera.y - marginPx;
  const maxX = camera.x + camera.visibleWorldWidth + marginPx;
  const maxY = camera.y + camera.visibleWorldHeight + marginPx;

  const labelY = getNametagDrawY(anchorTopY);
  return worldX >= minX && worldX <= maxX && labelY >= minY && labelY <= maxY;
}

export function getPlayerNametagAnchor(position: WorldPoint): NametagAnchor {
  const bounds = resolvePlayerVisualBounds(position);
  return {
    worldX: position.x,
    anchorTopY: bounds.y,
  };
}

/**
 * Desenha nametag no canvas — preferir syncDomNametags() para texto nítido.
 * @deprecated Use worldDomOverlay.syncWorldDomOverlay
 */
/** @deprecated Use syncWorldDomOverlay — mantido apenas para detectar chamadas legadas. */
export function drawNametag(
  _ctx: CanvasRenderingContext2D,
  _anchor: NametagAnchor,
  _view: NametagView,
  _camera?: Camera | null,
): void {
  warnLegacyRenderCall('drawNametag', 'syncWorldDomOverlay()');
}
