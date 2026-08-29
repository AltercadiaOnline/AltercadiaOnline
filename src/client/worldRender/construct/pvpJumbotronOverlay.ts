/**
 * Pintura do telão PvP no overlay da cidade — âncora no prop telao_pvp.
 * Sem clique. Sem BattleScreen. Espelha o snapshot do state-sync.
 */
import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import type { ExplorationRenderFrame } from '../../app/bridge/explorationRenderBridge.js';
import { PlayerSprite } from '../../entities/player/PlayerSprite.js';
import { DEFAULT_PLAYER_SKIN_ID } from '../../entities/player/playerConstants.js';
import type { PlayerSkinBundleId } from '../../../shared/character/playerSkinBundle.js';
import { resolvePvpJumbotronWorldRect } from '../../../shared/combat/pvp/pvpJumbotronLayout.js';
import {
  PVP_JUMBOTRON_IDLE_LABEL,
  type PvpJumbotronFighter,
  type PvpJumbotronSnapshot,
} from '../../../shared/combat/pvp/pvpJumbotronSnapshot.js';
import { disableCanvasImageSmoothing } from '../../layout/gamePixelScale.js';
import { snapToPixel } from '../../render/pixelSnap.js';
import { getPvpJumbotronMirror } from '../../world/pvpJumbotronStore.js';

const VIEW_W = DESIGN_CONFIG.VIEWPORT.WIDTH;
const VIEW_H = DESIGN_CONFIG.VIEWPORT.HEIGHT;
const TILE = DESIGN_CONFIG.TILE.SIZE;
const SPRITE_SCALE = 0.55;
const NAME_MAX = 10;

const jumbotronSprites = new Map<PlayerSkinBundleId, PlayerSprite>();

function getSprite(skinBundleId: PlayerSkinBundleId): PlayerSprite {
  let sprite = jumbotronSprites.get(skinBundleId);
  if (!sprite) {
    sprite = new PlayerSprite(skinBundleId);
    jumbotronSprites.set(skinBundleId, sprite);
  }
  return sprite;
}

function rectOnCamera(
  x: number,
  y: number,
  width: number,
  height: number,
  cameraX: number,
  cameraY: number,
): boolean {
  return x + width > cameraX
    && x < cameraX + VIEW_W
    && y + height > cameraY
    && y < cameraY + VIEW_H;
}

function truncateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= NAME_MAX) return trimmed;
  return `${trimmed.slice(0, NAME_MAX - 1)}…`;
}

function drawHpBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  hp: number,
  maxHp: number,
): void {
  const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  ctx.fillStyle = '#140e18';
  ctx.fillRect(x, y, width, 4);
  ctx.fillStyle = ratio <= 0.3 ? '#e24b4b' : '#3dcf7a';
  ctx.fillRect(x, y, Math.round(width * ratio), 4);
  ctx.strokeStyle = 'rgba(220, 210, 170, 0.45)';
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 3);
}

function drawFighterColumn(
  ctx: CanvasRenderingContext2D,
  fighter: PvpJumbotronFighter,
  colX: number,
  colW: number,
  spriteGroundY: number,
  timestampMs: number,
): void {
  const skin = fighter.skinBundleId || DEFAULT_PLAYER_SKIN_ID;
  const sprite = getSprite(skin);
  sprite.setMoving(false);
  sprite.update(timestampMs);
  const feetX = snapToPixel(colX + colW / 2);
  const groundY = snapToPixel(spriteGroundY);
  ctx.save();
  ctx.translate(feetX, groundY);
  ctx.scale(SPRITE_SCALE, SPRITE_SCALE);
  ctx.translate(-feetX, -groundY);
  sprite.draw(
    ctx,
    {
      x: feetX,
      y: groundY - TILE / 2,
      facing: 'south',
    },
    timestampMs,
  );
  ctx.restore();

  ctx.fillStyle = '#f2ead2';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(truncateName(fighter.displayName), feetX, spriteGroundY + 2, colW - 4);
  drawHpBar(ctx, colX + 4, spriteGroundY + 11, colW - 8, fighter.hp, fighter.maxHp);
}

function drawIdle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  ctx.fillStyle = '#d8c98a';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(PVP_JUMBOTRON_IDLE_LABEL, x + width / 2, y + height / 2, width - 8);
}

function drawLive(
  ctx: CanvasRenderingContext2D,
  snapshot: PvpJumbotronSnapshot,
  x: number,
  y: number,
  width: number,
  height: number,
  timestampMs: number,
): void {
  const logH = 10;
  const bodyH = height - logH - 4;
  const colW = Math.floor((width - 10) / 2);
  const groundY = y + 3 + Math.max(28, bodyH - 16);
  const left = snapshot.sides[0];
  const right = snapshot.sides[1];
  if (left) {
    drawFighterColumn(ctx, left, x + 3, colW, groundY, timestampMs);
  }
  if (right) {
    drawFighterColumn(ctx, right, x + width - 3 - colW, colW, groundY, timestampMs);
  }
  ctx.fillStyle = 'rgba(210, 200, 150, 0.85)';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const log = snapshot.lastLogLine.trim();
  if (log) {
    ctx.fillText(log, x + width / 2, y + height - logH / 2 - 1, width - 8);
  }
}

export function renderPvpJumbotronOverlay(
  ctx: CanvasRenderingContext2D,
  frame: ExplorationRenderFrame,
): void {
  const rect = resolvePvpJumbotronWorldRect(frame.mapId);
  if (!rect) return;
  if (!rectOnCamera(rect.x, rect.y, rect.width, rect.height, frame.cameraX, frame.cameraY)) {
    return;
  }

  const x = snapToPixel(rect.x);
  const y = snapToPixel(rect.y);
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  const snapshot = getPvpJumbotronMirror();

  ctx.save();
  disableCanvasImageSmoothing(ctx);
  ctx.fillStyle = 'rgba(10, 12, 20, 0.9)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  if (snapshot.phase !== 'in_battle') {
    drawIdle(ctx, x, y, width, height);
  } else {
    drawLive(ctx, snapshot, x, y, width, height, frame.timestampMs);
  }
  ctx.restore();
}

export function resetPvpJumbotronOverlaySprites(): void {
  jumbotronSprites.clear();
}
