/**
 * Motor de placeholders procedurais — `drawPlaceholder(type)` para Phaser.
 *
 * Cada tipo da planta baixa (prédio, escada, árvore, vending, chão…) vira uma
 * textura canvas com paleta cyberpunk. Quando existir `alias.png` em
 * `/assets/props/props/`, o controller troca automaticamente pelo PNG real.
 */
import type { PlaceholderTypeId } from '../../world/placeholderRenderer.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';
import { CYBERPUNK } from './phaserCyberpunkPalette.js';
import type {
  PhaserLayoutContainer,
  PhaserLayoutImage,
  PhaserLayoutScene,
} from './phaserLayoutScene.js';
import { TerrainLayoutKind } from './terrainLayoutPalette.js';

export type PlaceholderDrawType =
  | 'ground'
  | 'building'
  | 'stairs'
  | 'tree'
  | 'vending_machine'
  | 'street_light'
  | 'prop'
  | 'npc'
  | 'arena'
  | 'monitor';

type PlaceholderTextures = PhaserLayoutScene['textures'] & {
  addCanvas?: (key: string, canvas: HTMLCanvasElement) => unknown;
};

const TEX_PREFIX = 'altercadia-placeholder';

function hexToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function strokeRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  lineWidth = 2,
): void {
  ctx.strokeStyle = hexToCss(color);
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  ctx.fillStyle = hexToCss(color);
  ctx.fillRect(x, y, w, h);
}

function drawGroundTile(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  kind: TerrainLayoutKind,
): void {
  ctx.clearRect(0, 0, w, h);

  let fill: number = CYBERPUNK.asphalt;
  let stroke: number = CYBERPUNK.cyanDim;
  let accent: number = CYBERPUNK.cyan;

  switch (kind) {
    case TerrainLayoutKind.STREET:
      fill = CYBERPUNK.asphalt;
      stroke = CYBERPUNK.cyan;
      break;
    case TerrainLayoutKind.PLAZA:
      fill = CYBERPUNK.slate;
      stroke = CYBERPUNK.cyanDim;
      break;
    case TerrainLayoutKind.GRASS:
      fill = CYBERPUNK.grassDark;
      stroke = CYBERPUNK.grassAccent;
      accent = CYBERPUNK.purpleDark;
      break;
    case TerrainLayoutKind.ARENA:
      fill = 0x2a1f18;
      stroke = CYBERPUNK.amber;
      accent = CYBERPUNK.amber;
      break;
    case TerrainLayoutKind.TOWER:
      fill = 0x1e2438;
      stroke = CYBERPUNK.cyan;
      break;
    case TerrainLayoutKind.COMMERCIAL:
      fill = 0x2a2420;
      stroke = CYBERPUNK.amberDim;
      accent = CYBERPUNK.amber;
      break;
    case TerrainLayoutKind.BUILDING_PAD:
      fill = CYBERPUNK.slateDark;
      stroke = CYBERPUNK.metal;
      break;
    case TerrainLayoutKind.WATER:
      fill = CYBERPUNK.water;
      stroke = CYBERPUNK.cyanDim;
      break;
    default:
      break;
  }

  fillRect(ctx, 0, 0, w, h, fill);

  ctx.fillStyle = hexToCss(stroke);
  ctx.globalAlpha = 0.15;
  const step = Math.max(4, Math.floor(w / 4));
  for (let gx = step; gx < w; gx += step) {
    ctx.fillRect(gx, 0, 1, h);
  }
  for (let gy = step; gy < h; gy += step) {
    ctx.fillRect(0, gy, w, 1);
  }
  ctx.globalAlpha = 1;

  if (accent !== undefined) {
    ctx.fillStyle = hexToCss(accent);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(w - 3, 0, 3, h);
    ctx.globalAlpha = 1;
  }

  strokeRect(ctx, 0, 0, w, h, stroke, 1);
}

function drawBuilding(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  fillRect(ctx, 0, 0, w, h, CYBERPUNK.slateDark);
  strokeRect(ctx, 0, 0, w, h, CYBERPUNK.cyan, 2);

  const cols = Math.max(2, Math.floor(w / 12));
  const rows = Math.max(2, Math.floor(h / 16));
  const winW = Math.max(4, Math.floor(w / cols) - 4);
  const winH = Math.max(4, Math.floor(h / rows) - 6);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const wx = 4 + col * (winW + 4);
      const wy = 4 + row * (winH + 6);
      const neon = (row + col) % 2 === 0 ? CYBERPUNK.cyan : CYBERPUNK.pink;
      fillRect(ctx, wx, wy, winW, winH, CYBERPUNK.asphaltLight);
      strokeRect(ctx, wx, wy, winW, winH, neon, 1);
    }
  }

  fillRect(ctx, 0, h - 4, w, 4, CYBERPUNK.outline);
}

function drawStairs(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  fillRect(ctx, 0, 0, w, h, 0x2a1f18);

  const steps = Math.max(3, Math.min(5, Math.floor(h / 8)));
  for (let i = 0; i < steps; i += 1) {
    const stepH = Math.floor(h / steps);
    const y = h - (i + 1) * stepH;
    const shade = i % 2 === 0 ? 0x3a3028 : 0x4a4038;
    fillRect(ctx, 0, y, w, stepH, shade);
    strokeRect(ctx, 0, y, w, stepH, CYBERPUNK.amber, 1);
  }
  strokeRect(ctx, 0, 0, w, h, CYBERPUNK.amber, 2);
}

function drawTree(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);

  const trunkH = Math.max(8, Math.floor(h * 0.25));
  const cx = Math.floor(w / 2);

  fillRect(ctx, cx - Math.floor(w * 0.35), h - trunkH - 4, Math.floor(w * 0.7), trunkH + 4, CYBERPUNK.metal);
  strokeRect(ctx, cx - Math.floor(w * 0.35), h - trunkH - 4, Math.floor(w * 0.7), trunkH + 4, CYBERPUNK.outline, 1);

  const canopyR = Math.min(w, h) * 0.42;
  const canopyY = h - trunkH - canopyR * 0.6;
  ctx.fillStyle = hexToCss(CYBERPUNK.purple);
  ctx.beginPath();
  ctx.arc(cx, canopyY, canopyR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hexToCss(CYBERPUNK.pink);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = hexToCss(CYBERPUNK.pink);
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(cx - canopyR * 0.25, canopyY - canopyR * 0.15, canopyR * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  strokeRect(ctx, 0, 0, w, h, CYBERPUNK.purpleDark, 1);
}

function drawVendingMachine(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  fillRect(ctx, 0, 0, w, h, CYBERPUNK.slateDark);
  strokeRect(ctx, 0, 0, w, h, CYBERPUNK.cyan, 2);

  const screenH = Math.floor(h * 0.55);
  fillRect(ctx, 3, 3, w - 6, screenH, CYBERPUNK.asphalt);
  strokeRect(ctx, 3, 3, w - 6, screenH, CYBERPUNK.cyan, 1);
  fillRect(ctx, 6, 6, w - 12, screenH - 8, CYBERPUNK.cyanDim);
  fillRect(ctx, 3, h - 10, w - 6, 7, CYBERPUNK.amberDim);
}

function drawStreetLight(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);

  const poleW = Math.max(3, Math.floor(w * 0.12));
  const cx = Math.floor(w / 2);
  fillRect(ctx, cx - Math.floor(poleW / 2), Math.floor(h * 0.15), poleW, h - Math.floor(h * 0.15), CYBERPUNK.metal);

  const lampW = Math.max(8, Math.floor(w * 0.7));
  const lampH = Math.max(6, Math.floor(h * 0.12));
  fillRect(ctx, cx - Math.floor(lampW / 2), 2, lampW, lampH, CYBERPUNK.cyanDim);
  strokeRect(ctx, cx - Math.floor(lampW / 2), 2, lampW, lampH, CYBERPUNK.cyan, 2);
}

function drawProp(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  fillRect(ctx, 2, 2, w - 4, h - 4, CYBERPUNK.metal);
  strokeRect(ctx, 0, 0, w, h, CYBERPUNK.cyanDim, 2);
  fillRect(ctx, Math.floor(w * 0.25), Math.floor(h * 0.25), Math.floor(w * 0.5), Math.floor(h * 0.5), CYBERPUNK.slate);
}

function drawNpc(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const cx = Math.floor(w / 2);
  fillRect(ctx, cx - 6, h - 14, 12, 14, CYBERPUNK.npc);
  ctx.fillStyle = hexToCss(CYBERPUNK.pink);
  ctx.beginPath();
  ctx.arc(cx, h - 22, 8, 0, Math.PI * 2);
  ctx.fill();
  strokeRect(ctx, 0, 0, w, h, CYBERPUNK.pink, 2);
}

function drawArena(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  drawGroundTile(ctx, w, h, TerrainLayoutKind.ARENA);
  const inset = Math.max(2, Math.floor(Math.min(w, h) * 0.15));
  strokeRect(ctx, inset, inset, w - inset * 2, h - inset * 2, CYBERPUNK.amber, 2);
  fillRect(ctx, Math.floor(w / 2) - 2, Math.floor(h / 2) - 2, 4, 4, CYBERPUNK.amber);
}

function drawMonitor(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  fillRect(ctx, 2, 2, w - 4, h - 6, CYBERPUNK.slateDark);
  fillRect(ctx, 4, 4, w - 8, h - 14, CYBERPUNK.cyanDim);
  strokeRect(ctx, 0, 0, w, h, CYBERPUNK.cyan, 2);
  fillRect(ctx, Math.floor(w / 2) - 3, h - 6, 6, 4, CYBERPUNK.metal);
}

function createPlaceholderCanvas(
  type: PlaceholderDrawType,
  w: number,
  h: number,
  groundKind?: TerrainLayoutKind,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(w));
  canvas.height = Math.max(1, Math.floor(h));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  switch (type) {
    case 'ground':
      drawGroundTile(ctx, canvas.width, canvas.height, groundKind ?? TerrainLayoutKind.PLAZA);
      break;
    case 'building':
      drawBuilding(ctx, canvas.width, canvas.height);
      break;
    case 'stairs':
      drawStairs(ctx, canvas.width, canvas.height);
      break;
    case 'tree':
      drawTree(ctx, canvas.width, canvas.height);
      break;
    case 'vending_machine':
      drawVendingMachine(ctx, canvas.width, canvas.height);
      break;
    case 'street_light':
      drawStreetLight(ctx, canvas.width, canvas.height);
      break;
    case 'npc':
      drawNpc(ctx, canvas.width, canvas.height);
      break;
    case 'arena':
      drawArena(ctx, canvas.width, canvas.height);
      break;
    case 'monitor':
      drawMonitor(ctx, canvas.width, canvas.height);
      break;
    default:
      drawProp(ctx, canvas.width, canvas.height);
      break;
  }

  return canvas;
}

function textureKey(
  type: PlaceholderDrawType,
  w: number,
  h: number,
  groundKind?: TerrainLayoutKind,
): string {
  const gk = groundKind ?? 'none';
  return `${TEX_PREFIX}:${type}:${gk}:${w}x${h}`;
}

export function ensurePlaceholderTexture(
  textures: PlaceholderTextures,
  type: PlaceholderDrawType,
  widthPx: number,
  heightPx: number,
  groundKind?: TerrainLayoutKind,
): string | null {
  const w = Math.max(1, Math.floor(widthPx));
  const h = Math.max(1, Math.floor(heightPx));
  const key = textureKey(type, w, h, groundKind);

  if (textures.exists(key)) return key;

  const canvas = createPlaceholderCanvas(type, w, h, groundKind);
  if (!canvas || !textures.addCanvas) return null;

  textures.addCanvas(key, canvas);
  try {
    textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
  } catch {
    /* noop */
  }
  return key;
}

const TREE_RE = /(plant|planta|bush|flower|flor|fern|samambaia|cactus|cacto|tree|arvore|árvore|willow|mushroom|cogumelo|cherry)/;
const LIGHT_RE = /(street_light|poste|lamp|road_lamp)/;
const VENDING_RE = /(vending|minishop|food_stall|food_block|stall|gacha|callbox)/;
const BUILDING_RE = /(casa|house|houses|building|booth|refraction|refra|market|arena|tower|spire|torre)/;
const NPC_RE = /(npc|anciao|anciã|mercenario|ferreiro|vendedor|alquimista|banqueiro|instrutor)/;
const MONITOR_RE = /(monitor|ranking|screen)/;

export function resolvePlaceholderDrawType(
  assetKey: string,
  placeholderType?: PlaceholderTypeId,
): PlaceholderDrawType {
  const key = assetKey.toLowerCase();

  if (placeholderType === 'ARENA_STEP' || placeholderType === 'TOWER_STEP') return 'stairs';
  if (placeholderType === 'ARENA_FLOOR' || placeholderType === 'SPECTATOR_RING') return 'arena';
  if (placeholderType === 'RANKING_MONITOR') return 'monitor';
  if (placeholderType === 'NPC_SPOT') return 'npc';
  if (placeholderType === 'BUILDING' || placeholderType === 'TOWER_BUILDING') return 'building';
  if (placeholderType === 'INTERACTIVE_OBJ') return 'vending_machine';
  if (placeholderType === 'REFRACTION_BOOTH') return 'vending_machine';

  if (TREE_RE.test(key)) return 'tree';
  if (LIGHT_RE.test(key)) return 'street_light';
  if (VENDING_RE.test(key)) return 'vending_machine';
  if (MONITOR_RE.test(key)) return 'monitor';
  if (BUILDING_RE.test(key)) return 'building';
  if (NPC_RE.test(key)) return 'npc';

  return 'prop';
}

export type DrawnPlaceholderOptions = {
  readonly assetKey: string;
  readonly placeholderType?: PlaceholderTypeId;
  readonly feetX: number;
  readonly feetY: number;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly depth: number;
};

export function ensureDrawnPlaceholderSprite(
  scene: PhaserLayoutScene,
  container: PhaserLayoutContainer,
  existing: PhaserLayoutImage | null,
  options: DrawnPlaceholderOptions,
): PhaserLayoutImage | null {
  const type = resolvePlaceholderDrawType(options.assetKey, options.placeholderType);
  const texKey = ensurePlaceholderTexture(
    scene.textures as PlaceholderTextures,
    type,
    options.widthPx,
    options.heightPx,
  );
  if (!texKey) return null;

  const x = Math.floor(options.feetX);
  const y = Math.floor(options.feetY);

  let sprite = existing;
  if (!sprite) {
    sprite = scene.add.image(x, y, texKey);
    sprite.setOrigin(0.5, 1);
    container.add(sprite);
  } else {
    sprite.setTexture(texKey);
  }

  sprite.setPosition(x, y);
  sprite.setDisplaySize(options.widthPx, options.heightPx);
  sprite.setDepth(options.depth);
  sprite.setVisible(true);
  return sprite;
}

export function drawPlaceholder(
  scene: PhaserLayoutScene,
  container: PhaserLayoutContainer,
  type: PlaceholderDrawType,
  options: Omit<DrawnPlaceholderOptions, 'placeholderType'> & { readonly placeholderType?: PlaceholderTypeId },
  existing?: PhaserLayoutImage | null,
): PhaserLayoutImage | null {
  return ensureDrawnPlaceholderSprite(scene, container, existing ?? null, {
    ...options,
    assetKey: options.assetKey || type,
  });
}

export function ensureGroundPlaceholderTexture(
  textures: PlaceholderTextures,
  kind: TerrainLayoutKind,
  tileSize: number,
): string | null {
  return ensurePlaceholderTexture(textures, 'ground', tileSize, tileSize, kind);
}
