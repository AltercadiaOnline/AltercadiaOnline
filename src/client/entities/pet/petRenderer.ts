import { getPetVisualBounds } from '../../../shared/world/petEntity.js';
import type { PlayerFacing } from '../../../shared/world/playerFacing.js';
import type { PetKindId } from '../../../shared/pet/petCatalog.js';
import { getPetColorPalette, type PetColorId } from '../../../shared/pet/petColorPalette.js';
import { getDefaultPetGenderId, type PetGenderId } from '../../../shared/pet/petGender.js';
import { disableCanvasImageSmoothing } from '../../layout/gamePixelScale.js';
import { resolveTrimmedAssetSourceRect } from '../player/playerSpriteSourceTrim.js';
import type { PetRenderSnapshot } from './PetFollowEntity.js';
import { PetSpriteLoader } from './PetSpriteLoader.js';

const OUTLINE = '#142026';

const PET_SRC_TRIM = {
  top: 0.04,
  bottom: 0.12,
  left: 0.04,
  right: 0.04,
} as const;

function facingMirrorScale(facing: PlayerFacing): number {
  return facing === 'west' ? -1 : 1;
}

function resolvePetFacing(snapshot: PetRenderSnapshot): PlayerFacing {
  return snapshot.facing;
}

function renderPetPngSprite(
  ctx: CanvasRenderingContext2D,
  kindId: PetKindId,
  facing: PlayerFacing,
  w: number,
  h: number,
): boolean {
  const frame = PetSpriteLoader.getCachedRotation(kindId, facing)
    ?? PetSpriteLoader.getCachedRotation(kindId, 'south');
  if (!frame) return false;

  const naturalW = frame.image.naturalWidth || frame.image.width;
  const naturalH = frame.image.naturalHeight || frame.image.height;
  const trimmed = resolveTrimmedAssetSourceRect(naturalW, naturalH, PET_SRC_TRIM);

  disableCanvasImageSmoothing(ctx);
  ctx.drawImage(
    frame.image,
    trimmed.sx,
    trimmed.sy,
    trimmed.sw,
    trimmed.sh,
    -w / 2,
    -h / 2,
    w,
    h,
  );
  return true;
}

function drawTechCollar(ctx: CanvasRenderingContext2D, w: number, y: number, ledColor: string): void {
  ctx.strokeStyle = '#2d3748';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w * 0.28, y);
  ctx.lineTo(w * 0.28, y);
  ctx.stroke();
  ctx.fillStyle = ledColor;
  ctx.fillRect(-4, y - 3, 8, 6);
}

function drawFeminineBow(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  accentColor: string,
): void {
  ctx.fillStyle = accentColor;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, y - w * 0.06);
  ctx.lineTo(-w * 0.08, y - w * 0.12);
  ctx.lineTo(-w * 0.04, y - w * 0.04);
  ctx.lineTo(0, y - w * 0.02);
  ctx.lineTo(w * 0.04, y - w * 0.04);
  ctx.lineTo(w * 0.08, y - w * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawTechPack(ctx: CanvasRenderingContext2D, w: number, ledColor: string): void {
  ctx.fillStyle = '#1f2937';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-w * 0.12, -w * 0.08, w * 0.24, w * 0.22, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ledColor;
  ctx.fillRect(-w * 0.04, -w * 0.02, 3, 3);
  ctx.fillRect(w * 0.01, -w * 0.02, 3, 3);
}

function renderDimensionalCat(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  animPhase: number,
  palette: ReturnType<typeof getPetColorPalette>,
  gender: PetGenderId,
): void {
  const isFemale = gender === 'female';
  const bodyScale = isFemale ? 0.94 : 1.02;
  const bw = w * bodyScale;
  const bh = h * bodyScale;

  const tailWave = Math.sin(animPhase * 2.4) * 0.18;
  ctx.fillStyle = palette.fur;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, bw * 0.34, bh * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  if (isFemale) {
    ctx.moveTo(-bw * 0.16, -bh * 0.16);
    ctx.quadraticCurveTo(-bw * 0.1, -bh * 0.36, -bw * 0.02, -bh * 0.16);
    ctx.moveTo(bw * 0.16, -bh * 0.16);
    ctx.quadraticCurveTo(bw * 0.1, -bh * 0.36, bw * 0.02, -bh * 0.16);
  } else {
    ctx.moveTo(-bw * 0.18, -bh * 0.18);
    ctx.lineTo(-bw * 0.08, -bh * 0.38);
    ctx.lineTo(-bw * 0.02, -bh * 0.16);
    ctx.moveTo(bw * 0.18, -bh * 0.18);
    ctx.lineTo(bw * 0.08, -bh * 0.38);
    ctx.lineTo(bw * 0.02, -bh * 0.16);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.eye;
  ctx.beginPath();
  ctx.arc(-bw * 0.12, -bh * 0.04, isFemale ? 2.6 : 3, 0, Math.PI * 2);
  ctx.arc(bw * 0.12, -bh * 0.04, isFemale ? 2.6 : 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bw * 0.28, bh * 0.05);
  ctx.quadraticCurveTo(bw * 0.55, bh * (0.15 + tailWave), bw * 0.42, bh * 0.32);
  ctx.stroke();

  drawTechCollar(ctx, bw, bh * 0.12, palette.led);
  if (isFemale) {
    drawFeminineBow(ctx, bw, bh * 0.12, palette.tag);
  }
  drawTechPack(ctx, bw, palette.led);
}

function renderDimensionalDog(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  animPhase: number,
  palette: ReturnType<typeof getPetColorPalette>,
  gender: PetGenderId,
): void {
  const isFemale = gender === 'female';
  const bodyScale = isFemale ? 0.92 : 1.06;
  const bw = w * bodyScale;
  const bh = h * bodyScale;
  const guardBob = Math.sin(animPhase * 1.4) * 0.04;

  ctx.fillStyle = palette.fur;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-bw * 0.36, -bh * (0.22 + guardBob), bw * 0.72, bh * 0.48, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(0, -bh * 0.28, bw * 0.22, bh * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.eye;
  ctx.beginPath();
  ctx.ellipse(0, -bh * 0.18, bw * 0.12, bh * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2a211c';
  ctx.beginPath();
  ctx.arc(-bw * 0.08, -bh * 0.3, 2.5, 0, Math.PI * 2);
  ctx.arc(bw * 0.08, -bh * 0.3, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(-bw * 0.2, -bh * 0.34, bw * 0.1, bh * 0.14, -0.4, 0, Math.PI * 2);
  ctx.ellipse(bw * 0.2, -bh * 0.34, bw * 0.1, bh * 0.14, 0.4, 0, Math.PI * 2);
  ctx.fill();

  if (isFemale) {
    drawFeminineBow(ctx, bw, -bh * 0.36, palette.tag);
  }

  drawTechCollar(ctx, bw, bh * 0.14, palette.led);
  drawTechPack(ctx, bw, palette.led);

  ctx.fillStyle = 'rgba(20, 32, 38, 0.35)';
  ctx.fillRect(-bw * 0.38, bh * 0.18, bw * 0.76, bh * 0.08);
}

function renderPetBody(
  ctx: CanvasRenderingContext2D,
  kindId: PetKindId,
  colorId: PetColorId,
  w: number,
  h: number,
  animPhase: number,
  gender: PetGenderId = getDefaultPetGenderId(),
  facing: PlayerFacing = 'south',
): void {
  if (renderPetPngSprite(ctx, kindId, facing, w, h)) {
    return;
  }

  const palette = getPetColorPalette(colorId);
  if (kindId === 'dimensional_dog') {
    renderDimensionalDog(ctx, w, h, animPhase, palette, gender);
    return;
  }
  renderDimensionalCat(ctx, w, h, animPhase, palette, gender);
}

export function renderPetSprite(
  ctx: CanvasRenderingContext2D,
  snapshot: PetRenderSnapshot,
  timestampMs = 0,
): void {
  const bounds = getPetVisualBounds(snapshot);
  const bob = Math.sin(timestampMs * 0.006 + snapshot.animPhase) * (snapshot.kindId === 'dimensional_cat' ? 2.5 : 1.2);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2 + bob;
  const w = bounds.width * 0.82;
  const h = bounds.height * 0.72;
  const facing = resolvePetFacing(snapshot);
  const usePng = PetSpriteLoader.hasPngSprites(snapshot.kindId);

  ctx.save();
  ctx.translate(cx, cy);
  if (!usePng) {
    ctx.scale(facingMirrorScale(facing), 1);
  }
  renderPetBody(ctx, snapshot.kindId, snapshot.colorId, w, h, snapshot.animPhase, snapshot.gender, facing);

  ctx.restore();
}

/** Preview estático para cards da loja do Treinador Zeno. */
export function renderPetShopPreview(
  ctx: CanvasRenderingContext2D,
  kindId: PetKindId,
  x: number,
  y: number,
  size: number,
  colorId?: PetColorId,
  gender?: PetGenderId,
): void {
  const resolvedColor = colorId ?? (kindId === 'dimensional_dog' ? 'amber' : 'slate');
  const resolvedGender = gender ?? getDefaultPetGenderId();
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  renderPetBody(ctx, kindId, resolvedColor, size * 0.72, size * 0.62, 0, resolvedGender, 'south');
  ctx.restore();
}

/** Render compacto para HUD de batalha e ficha do personagem. */
export function renderPetPortrait(
  ctx: CanvasRenderingContext2D,
  kindId: PetKindId,
  colorId: PetColorId,
  size: number,
  animPhase = 0,
  gender: PetGenderId = getDefaultPetGenderId(),
): void {
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  renderPetBody(ctx, kindId, colorId, size * 0.72, size * 0.62, animPhase, gender, 'south');
  ctx.restore();
}
