import type { CombatVfxEffectType } from '../../../shared/combat/combatVfxEffectTypes.js';
import type { ClassType } from '../../../shared/types/classes.js';
import type { PhaserVfxPosition } from './phaserBattleVfxAnchors.js';
import {
  blendClassTint,
  PHASER_PROJECTILE_STYLES,
  type PhaserProjectileStyle,
} from './phaserBattleProjectileStyles.js';
import type { PhaserSceneGraphics } from '../scenes/MainScene.js';

const VFX_DEPTH = 24;

type MovableGfx = PhaserSceneGraphics & {
  x: number;
  y: number;
  alpha: number;
  rotation: number;
  save: () => void;
  restore: () => void;
  translate: (x: number, y: number) => void;
  rotate: (angle: number) => void;
};

export type PhaserVfxScene = {
  add: {
    graphics: () => MovableGfx;
    text?: (
      x: number,
      y: number,
      content: string,
      style?: Record<string, unknown>,
    ) => unknown;
  };
};

export type PhaserProjectileContext = {
  readonly scene: PhaserVfxScene;
  readonly from: PhaserVfxPosition;
  readonly to: PhaserVfxPosition;
  readonly classId: ClassType;
  readonly effectType: CombatVfxEffectType;
};

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function styledColors(style: PhaserProjectileStyle, classId: ClassType) {
  return {
    core: blendClassTint(style.coreColor, classId),
    glow: blendClassTint(style.glowColor, classId, 0.45),
    accent: blendClassTint(style.accentColor, classId, 0.25),
  };
}

function placeBar(
  gfx: MovableGfx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  color: number,
  alpha = 1,
): void {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  gfx.save();
  gfx.translate(mx, my);
  gfx.rotate(angle);
  gfx.fillStyle(color, alpha);
  gfx.fillRect(-len / 2, -thickness / 2, len, thickness);
  gfx.restore();
}

function drawOrb(gfx: MovableGfx, style: PhaserProjectileStyle, colors: ReturnType<typeof styledColors>): void {
  if (style.glowRadius > 0) {
    gfx.fillStyle(colors.glow, 0.35);
    gfx.fillCircle(0, 0, style.glowRadius);
  }
  gfx.fillStyle(colors.core, 1);
  gfx.fillCircle(0, 0, style.coreRadius);
  gfx.fillStyle(colors.accent, 0.85);
  gfx.fillCircle(-style.coreRadius * 0.25, -style.coreRadius * 0.25, Math.max(2, style.coreRadius * 0.35));
}

function drawDiamond(gfx: MovableGfx, style: PhaserProjectileStyle, colors: ReturnType<typeof styledColors>): void {
  const r = style.coreRadius;
  gfx.fillStyle(colors.glow, 0.4);
  gfx.fillCircle(0, -r, r * 0.9);
  gfx.fillCircle(-r * 0.85, r * 0.55, r * 0.75);
  gfx.fillCircle(r * 0.85, r * 0.55, r * 0.75);
  gfx.fillStyle(colors.core, 1);
  gfx.fillCircle(0, -r * 0.85, r * 0.55);
  gfx.fillStyle(colors.accent, 0.8);
  gfx.fillRect(-1, -r, 2, r * 1.7);
}

function drawBolt(gfx: MovableGfx, colors: ReturnType<typeof styledColors>): void {
  const segments: ReadonlyArray<readonly [number, number, number, number]> = [
    [-12, -8, -2, -1],
    [-2, -1, -8, 2],
    [-8, 2, 10, 10],
    [10, 10, 0, 0],
    [0, 0, 8, -2],
  ];
  for (const [x1, y1, x2, y2] of segments) {
    placeBar(gfx, x1, y1, x2, y2, 4, colors.core, 1);
  }
  gfx.fillStyle(colors.accent, 0.8);
  gfx.fillCircle(0, 0, 3);
}

function drawSlash(gfx: MovableGfx, colors: ReturnType<typeof styledColors>, progress: number): void {
  const sweep = progress * 0.9;
  for (let i = -1; i <= 1; i += 1) {
    const len = 24 + i * 5;
    const angle = -0.9 + sweep + i * 0.15;
    const x2 = Math.cos(angle) * len;
    const y2 = Math.sin(angle) * len;
    placeBar(gfx, 0, 0, x2, y2, 3 - Math.abs(i), colors.core, 0.9 - Math.abs(i) * 0.15);
    gfx.fillStyle(colors.glow, 0.4);
    gfx.fillCircle(x2 * 0.55, y2 * 0.55, 3);
  }
}

function drawHex(gfx: MovableGfx, colors: ReturnType<typeof styledColors>, scale: number): void {
  const radius = 18 * scale;
  const points: Array<[number, number]> = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    points.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  for (let i = 0; i < 6; i += 1) {
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[(i + 1) % 6]!;
    placeBar(gfx, x1, y1, x2, y2, 3, colors.core, 0.9);
  }
  gfx.fillStyle(colors.glow, 0.22);
  gfx.fillCircle(0, 0, radius * 0.6);
}

function drawCross(gfx: MovableGfx, colors: ReturnType<typeof styledColors>, scale: number): void {
  const s = 10 * scale;
  gfx.fillStyle(colors.core, 0.9);
  gfx.fillRect(-s, -2, s * 2, 4);
  gfx.fillRect(-2, -s, 4, s * 2);
  gfx.fillStyle(colors.glow, 0.35);
  gfx.fillCircle(0, 0, s * 0.85);
}

async function animateTravel(
  scene: PhaserVfxScene,
  gfx: MovableGfx,
  style: PhaserProjectileStyle,
  colors: ReturnType<typeof styledColors>,
  from: PhaserVfxPosition,
  to: PhaserVfxPosition,
  redraw: () => void,
  durationMs: number,
  options: { readonly spin?: boolean; readonly flicker?: boolean } = {},
): Promise<void> {
  const trailGfx: MovableGfx[] = [];
  for (let i = 0; i < style.trailCount; i += 1) {
    const trail = scene.add.graphics();
    trail.setDepth(VFX_DEPTH - 1);
    trailGfx.push(trail);
  }

  const start = performance.now();
  while (true) {
    const elapsed = performance.now() - start;
    const t = Math.min(1, elapsed / durationMs);
    const eased = easeInOut(t);
    gfx.x = lerp(from.x, to.x, eased);
    gfx.y = lerp(from.y, to.y, eased) + Math.sin(t * Math.PI * 3) * 4;
    if (options.spin) gfx.rotation = t * Math.PI * 2;
    if (options.flicker) gfx.alpha = 0.65 + Math.sin(t * 28) * 0.35;
    gfx.clear();
    redraw();

    for (let i = 0; i < trailGfx.length; i += 1) {
      const lag = (i + 1) * 0.08;
      const tt = Math.max(0, t - lag);
      const trail = trailGfx[i]!;
      trail.x = lerp(from.x, to.x, easeInOut(tt));
      trail.y = lerp(from.y, to.y, easeInOut(tt));
      trail.clear();
      trail.fillStyle(colors.glow, 0.3 - i * 0.06);
      trail.fillCircle(0, 0, Math.max(2, style.coreRadius - i));
    }

    if (t >= 1) break;
    await waitMs(16);
  }

  for (const trail of trailGfx) trail.destroy();
}

export async function playPhaserProjectileEffect(ctx: PhaserProjectileContext): Promise<void> {
  const style = PHASER_PROJECTILE_STYLES[ctx.effectType];
  const colors = styledColors(style, ctx.classId);
  const gfx = ctx.scene.add.graphics();
  gfx.setDepth(VFX_DEPTH);

  try {
    switch (style.motion) {
      case 'travel': {
        const redraw = (): void => {
          if (style.shape === 'diamond') drawDiamond(gfx, style, colors);
          else if (style.shape === 'bolt') drawBolt(gfx, colors);
          else drawOrb(gfx, style, colors);
        };
        await animateTravel(
          ctx.scene,
          gfx,
          style,
          colors,
          ctx.from,
          ctx.to,
          redraw,
          style.durationMs,
          { spin: style.shape === 'diamond', flicker: style.shape === 'bolt' },
        );
        break;
      }
      case 'arc': {
        const mid = {
          x: lerp(ctx.from.x, ctx.to.x, 0.45),
          y: lerp(ctx.from.y, ctx.to.y, 0.45) - 18,
        };
        const start = performance.now();
        while (true) {
          const t = Math.min(1, (performance.now() - start) / style.durationMs);
          const eased = easeInOut(t);
          gfx.x = lerp(ctx.from.x, mid.x, eased);
          gfx.y = lerp(ctx.from.y, mid.y, eased);
          gfx.alpha = 1 - t * 0.35;
          gfx.clear();
          drawSlash(gfx, colors, t);
          if (t >= 1) break;
          await waitMs(16);
        }
        break;
      }
      case 'rise_at_source': {
        const start = performance.now();
        while (true) {
          const t = Math.min(1, (performance.now() - start) / style.durationMs);
          const scale = 0.6 + t * 1.4;
          gfx.x = ctx.from.x;
          gfx.y = ctx.from.y - t * 28;
          gfx.alpha = 1 - t * 0.75;
          gfx.clear();
          drawCross(gfx, colors, scale);
          gfx.fillStyle(colors.glow, 0.22);
          gfx.fillCircle(0, 0, style.glowRadius * scale);
          if (t >= 1) break;
          await waitMs(16);
        }
        break;
      }
      case 'burst_at_target': {
        const start = performance.now();
        while (true) {
          const t = Math.min(1, (performance.now() - start) / style.durationMs);
          gfx.x = ctx.to.x;
          gfx.y = ctx.to.y;
          gfx.alpha = 1 - t;
          gfx.clear();
          drawHex(gfx, colors, 0.5 + t * 1.1);
          if (t >= 1) break;
          await waitMs(16);
        }
        break;
      }
      default:
        break;
    }
  } finally {
    gfx.destroy();
  }
}
