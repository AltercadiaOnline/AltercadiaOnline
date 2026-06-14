import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { drawWorldAssetImage1To1 } from './worldAssetImageLoader.js';

/**
 * Sistema de renderização placeholder — PNG 1:1 quando disponível em public/assets/structures/.
 */
export const PlaceholderType = {
  BUILDING: 'BUILDING',
  NPC_SPOT: 'NPC_SPOT',
  ROAD_TILE: 'ROAD_TILE',
  INTERACTIVE_OBJ: 'INTERACTIVE_OBJ',
  GRASS: 'GRASS',
  PLAZA: 'PLAZA',
  /** Camada reservada — futuros avatares espectadores (sistema TV). */
  SPECTATOR_RING: 'SPECTATOR_RING',
  /** Piso do palco — mesmo plano do chão. */
  ARENA_FLOOR: 'ARENA_FLOOR',
  /** Degrau sul — borda de subida ao palco. */
  ARENA_STEP: 'ARENA_STEP',
  ARENA: 'ARENA',
  /** Prop de chão — púlpito/pedestal (renderizado via NPC em runtime). */
  PULPIT: 'PULPIT',
  /** Monitor de ranking — tela vertical ao lado da arena. */
  RANKING_MONITOR: 'RANKING_MONITOR',
  /** Estande de tiro / simulador de refração. */
  REFRACTION_BOOTH: 'REFRACTION_BOOTH',
  /** Piso da área da Torre (verticalidade localizada). */
  TOWER_FLOOR: 'TOWER_FLOOR',
  /** Degrau — altera height_level do jogador. */
  TOWER_STEP: 'TOWER_STEP',
  /** Ala / bloco da torre com Z local. */
  TOWER_BUILDING: 'TOWER_BUILDING',
  /** Prop urbano decorativo — PNG em public/assets/urban/props/. */
  URBAN_PROP: 'URBAN_PROP',
} as const;

export type PlaceholderTypeId = (typeof PlaceholderType)[keyof typeof PlaceholderType];

export type PlaceholderRenderOptions = {
  readonly tileSize?: number;
  /** Largura em pixels — padrão tileSize. */
  readonly widthPx?: number;
  /** Altura em pixels — padrão tileSize. */
  readonly heightPx?: number;
  readonly label?: string;
  readonly assetKey?: string;
  /** Nível Z local (0–3) — torre e degraus. */
  readonly heightLevel?: number;
};

export const PLACEHOLDER_COLORS = {
  grass: '#2a4a32',
  plaza: '#355a38',
  road: '#2c2c2c',
  buildingFill: '#4a4a4a',
  buildingEdge: '#6a6a6a',
  npcFill: '#7ec8ff',
  npcEdge: '#a8dcff',
  interactiveFill: '#f0d040',
  interactiveEdge: '#c8a820',
  labelBg: 'rgba(8, 10, 18, 0.85)',
  labelText: '#f0f4ff',
  arenaFill: '#4a3828',
  arenaCore: '#3a2a1a',
  arenaGlow: '#c9a227',
  arenaFloor: '#5c4632',
  arenaFloorEdge: 'rgba(201, 162, 39, 0.35)',
  arenaStep: '#4a3828',
  arenaStepHighlight: 'rgba(201, 168, 106, 0.55)',
  pulpitBody: '#2a3544',
  pulpitAccent: '#c9a86a',
  monitorBody: '#1a2230',
  monitorScreen: '#0c1018',
  monitorGlow: '#c9a86a',
  monitorText: '#e8c878',
  boothBody: '#243040',
  boothAccent: '#7ec8ff',
  boothTarget: '#ff6b6b',
  spectatorRing: 'rgba(180, 160, 110, 0.14)',
  spectatorRingEdge: 'rgba(201, 162, 39, 0.22)',
  towerFloor: '#2e3648',
  towerFloorEdge: 'rgba(140, 170, 220, 0.35)',
  towerStep: '#3a4558',
  towerStepHighlight: 'rgba(160, 200, 255, 0.65)',
  towerBody: '#3d4a62',
  towerBodyEdge: '#6a7a9a',
  towerAccent: '#8eb4ff',
  urbanConcrete: '#6b6f75',
  urbanMetal: '#5a6270',
  urbanNeon: '#4ac8b8',
} as const;

/** Metadados por assetKey — ponte para sprites futuros. */
export type PlaceholderAssetDef = {
  readonly type: PlaceholderTypeId;
  readonly label?: string;
};

export const PLACEHOLDER_ASSET_REGISTRY: Readonly<Record<string, PlaceholderAssetDef>> = {
  arena_tournament: { type: PlaceholderType.ARENA, label: 'TORNEIO/ARENA' },
  arena_ranking_monitor: { type: PlaceholderType.RANKING_MONITOR, label: 'RANKING' },
  refraction_booth: { type: PlaceholderType.REFRACTION_BOOTH, label: 'REFRAÇÃO' },
  food_stalls: { type: PlaceholderType.INTERACTIVE_OBJ, label: 'BARRAQUINHAS' },
  market_hall: { type: PlaceholderType.INTERACTIVE_OBJ, label: 'MERCADO' },
  casa_anciao: { type: PlaceholderType.BUILDING, label: 'CASA DO ANCIÃO' },
  casa_mercenario: { type: PlaceholderType.BUILDING, label: 'CASA MERCENÁRIO' },
  casa_ferreiro: { type: PlaceholderType.BUILDING, label: 'CASA DO FERREIRO' },
  casa_vendedor: { type: PlaceholderType.BUILDING, label: 'LOJA NPC' },
  casa_alquimista: { type: PlaceholderType.BUILDING, label: 'LABORATÓRIO' },
  casa_banqueiro: { type: PlaceholderType.BUILDING, label: 'BANCO' },
  portal_north: { type: PlaceholderType.INTERACTIVE_OBJ, label: 'Beco dos Fundos' },
  npc_anciao: { type: PlaceholderType.NPC_SPOT, label: 'Ancião Cael' },
  npc_mercenario: { type: PlaceholderType.NPC_SPOT, label: 'Mercenário' },
  npc_ferreiro: { type: PlaceholderType.NPC_SPOT, label: 'Ferreiro' },
  npc_vendedor: { type: PlaceholderType.NPC_SPOT, label: 'Vendedor' },
  npc_alquimista: { type: PlaceholderType.NPC_SPOT, label: 'Alquimista' },
  npc_banqueiro: { type: PlaceholderType.NPC_SPOT, label: 'Banqueiro' },
  npc_instrutor_refraction: { type: PlaceholderType.NPC_SPOT, label: 'Instrutor Kael' },
  tower_wing: { type: PlaceholderType.TOWER_BUILDING, label: 'TORRE' },
  tower_spire: { type: PlaceholderType.TOWER_BUILDING, label: 'CÚPULA' },
  street_light: { type: PlaceholderType.URBAN_PROP, label: 'Poste' },
  trash_can: { type: PlaceholderType.URBAN_PROP, label: 'Lixeira' },
  mailbox: { type: PlaceholderType.URBAN_PROP, label: 'Correio' },
  fire_hydrant: { type: PlaceholderType.URBAN_PROP, label: 'Hidrante' },
  park_bench: { type: PlaceholderType.URBAN_PROP, label: 'Banco' },
  fire_extinguisher: { type: PlaceholderType.URBAN_PROP, label: 'Extintor' },
  graffiti_wall: { type: PlaceholderType.URBAN_PROP, label: 'Grafite' },
};

function resolveSize(options: PlaceholderRenderOptions): { w: number; h: number } {
  const tile = options.tileSize ?? DESIGN_CONFIG.TILE.SIZE;
  return {
    w: options.widthPx ?? tile,
    h: options.heightPx ?? tile,
  };
}

export type RankingMonitorDecalAnchors = {
  readonly rank: { readonly worldX: number; readonly anchorTopY: number };
  readonly top: { readonly worldX: number; readonly anchorTopY: number };
};

/** Âncoras DOM para texto RANK/TOP — mesma geometria de drawRankingMonitor. */
export function resolveRankingMonitorDecalAnchors(
  x: number,
  y: number,
  w: number,
  h: number,
): RankingMonitorDecalAnchors {
  const pad = Math.max(2, w * 0.08);
  const frameW = w - pad * 2;
  const frameH = h - pad * 2;
  const frameX = x + pad;
  const frameY = y + pad;
  const screenPad = Math.max(2, frameW * 0.12);
  const screenX = frameX + screenPad;
  const screenY = frameY + screenPad;
  const screenW = frameW - screenPad * 2;
  const screenH = frameH * 0.72;
  return {
    rank: {
      worldX: screenX + screenW / 2,
      anchorTopY: screenY + screenH * 0.38,
    },
    top: {
      worldX: screenX + screenW / 2,
      anchorTopY: screenY + screenH * 0.62,
    },
  };
}

/** Arena compacta — núcleo 1×1 central + moldura proporcional ao footprint reduzido. */
function drawArenaCompact(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tileSize: number,
): void {
  const pad = Math.max(2, Math.min(w, h) * 0.06);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  ctx.fillStyle = PLACEHOLDER_COLORS.buildingFill;
  ctx.fillRect(x + pad, y + pad, innerW, innerH);
  ctx.strokeStyle = PLACEHOLDER_COLORS.buildingEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + pad + 0.5, y + pad + 0.5, innerW - 1, innerH - 1);

  const tilesWide = Math.max(1, Math.round(w / tileSize));
  const tilePx = innerW / tilesWide;
  const coreX = x + w / 2 - tilePx / 2;
  const coreY = y + h / 2 - tilePx / 2;

  ctx.fillStyle = PLACEHOLDER_COLORS.arenaCore;
  ctx.fillRect(coreX, coreY, tilePx, tilePx);
  ctx.strokeStyle = PLACEHOLDER_COLORS.arenaGlow;
  ctx.lineWidth = 2;
  ctx.strokeRect(coreX + 0.5, coreY + 0.5, tilePx - 1, tilePx - 1);

}

/** Monitor de ranking — coluna estreita com tela iluminada. */
function drawRankingMonitor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const pad = Math.max(2, w * 0.08);
  const frameW = w - pad * 2;
  const frameH = h - pad * 2;
  const frameX = x + pad;
  const frameY = y + pad;

  ctx.fillStyle = PLACEHOLDER_COLORS.monitorBody;
  ctx.fillRect(frameX, frameY, frameW, frameH);
  ctx.strokeStyle = PLACEHOLDER_COLORS.monitorGlow;
  ctx.lineWidth = 2;
  ctx.strokeRect(frameX + 0.5, frameY + 0.5, frameW - 1, frameH - 1);

  const screenPad = Math.max(2, frameW * 0.12);
  const screenX = frameX + screenPad;
  const screenY = frameY + screenPad;
  const screenW = frameW - screenPad * 2;
  const screenH = frameH * 0.72;

  ctx.fillStyle = PLACEHOLDER_COLORS.monitorScreen;
  ctx.fillRect(screenX, screenY, screenW, screenH);
  ctx.strokeStyle = 'rgba(201, 168, 106, 0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(screenX + 0.5, screenY + 0.5, screenW - 1, screenH - 1);

  const baseH = Math.max(3, frameH * 0.08);
  ctx.fillStyle = PLACEHOLDER_COLORS.pulpitBody;
  ctx.fillRect(frameX + frameW * 0.28, frameY + frameH - baseH, frameW * 0.44, baseH);

}

/** Estande de refração — cabine com alvo iluminado. */
function drawRefractionBooth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const pad = Math.max(3, w * 0.06);
  ctx.fillStyle = PLACEHOLDER_COLORS.boothBody;
  ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
  ctx.strokeStyle = PLACEHOLDER_COLORS.boothAccent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + pad + 0.5, y + pad + 0.5, w - pad * 2 - 1, h - pad * 2 - 1);

  const targetR = Math.min(w, h) * 0.12;
  const cx = x + w * 0.72;
  const cy = y + h * 0.38;
  ctx.strokeStyle = PLACEHOLDER_COLORS.boothTarget;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, targetR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, targetR * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = PLACEHOLDER_COLORS.boothAccent;
  ctx.fillRect(x + w * 0.12, y + h * 0.62, w * 0.28, h * 0.12);

}

/**
 * Desenha um placeholder procedural no canvas (coordenadas de mundo em pixels).
 */
export function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  type: PlaceholderTypeId,
  x: number,
  y: number,
  options: PlaceholderRenderOptions = {},
): void {
  const { w, h } = resolveSize(options);
  const pad = Math.max(1, w * 0.04);

  ctx.save();

  switch (type) {
    case PlaceholderType.GRASS:
      ctx.fillStyle = PLACEHOLDER_COLORS.grass;
      ctx.fillRect(x, y, w, h);
      break;

    case PlaceholderType.PLAZA:
      ctx.fillStyle = PLACEHOLDER_COLORS.plaza;
      ctx.fillRect(x, y, w, h);
      break;

    case PlaceholderType.ROAD_TILE:
      ctx.fillStyle = PLACEHOLDER_COLORS.road;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      break;

    case PlaceholderType.SPECTATOR_RING:
      ctx.fillStyle = PLACEHOLDER_COLORS.spectatorRing;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = PLACEHOLDER_COLORS.spectatorRingEdge;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      ctx.setLineDash([]);
      break;

    case PlaceholderType.ARENA_FLOOR:
      ctx.fillStyle = PLACEHOLDER_COLORS.arenaFloor;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = PLACEHOLDER_COLORS.arenaFloorEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      break;

    case PlaceholderType.ARENA_STEP: {
      ctx.fillStyle = PLACEHOLDER_COLORS.plaza;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = PLACEHOLDER_COLORS.arenaStep;
      ctx.fillRect(x, y, w, Math.max(3, h * 0.22));
      ctx.strokeStyle = PLACEHOLDER_COLORS.arenaStepHighlight;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + Math.max(3, h * 0.22));
      ctx.lineTo(x + w - 1, y + Math.max(3, h * 0.22));
      ctx.stroke();
      break;
    }

    case PlaceholderType.TOWER_FLOOR:
      ctx.fillStyle = PLACEHOLDER_COLORS.towerFloor;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = PLACEHOLDER_COLORS.towerFloorEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      break;

    case PlaceholderType.TOWER_STEP: {
      const level = options.heightLevel ?? 0;
      ctx.fillStyle = PLACEHOLDER_COLORS.towerFloor;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = PLACEHOLDER_COLORS.towerStep;
      ctx.fillRect(x, y, w, Math.max(4, h * 0.24));
      ctx.strokeStyle = PLACEHOLDER_COLORS.towerStepHighlight;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + Math.max(4, h * 0.24));
      ctx.lineTo(x + w - 1, y + Math.max(4, h * 0.24));
      ctx.stroke();
      const barCount = Math.min(4, level + 1);
      const barW = Math.max(2, Math.floor(w * 0.12));
      const barGap = 2;
      const totalW = barCount * barW + (barCount - 1) * barGap;
      let bx = x + Math.round(w / 2 - totalW / 2);
      const by = y + Math.round(h * 0.55);
      ctx.fillStyle = PLACEHOLDER_COLORS.towerAccent;
      for (let i = 0; i < barCount; i++) {
        ctx.fillRect(bx, by, barW, Math.max(3, Math.floor(h * 0.08)));
        bx += barW + barGap;
      }
      break;
    }

    case PlaceholderType.TOWER_BUILDING: {
      const level = options.heightLevel ?? 0;
      const inset = pad + level;
      ctx.fillStyle = PLACEHOLDER_COLORS.towerBody;
      ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
      ctx.strokeStyle = PLACEHOLDER_COLORS.towerBodyEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + inset + 0.5, y + inset + 0.5, w - inset * 2 - 1, h - inset * 2 - 1);
      ctx.fillStyle = PLACEHOLDER_COLORS.towerAccent;
      ctx.fillRect(x + w * 0.72, y + h * 0.12, w * 0.12, h * 0.2);
      break;
    }

    case PlaceholderType.PULPIT: {
      const cx = x + w / 2;
      const baseW = w * 0.55;
      const baseH = h * 0.18;
      const pillarH = h * 0.22;
      ctx.fillStyle = PLACEHOLDER_COLORS.pulpitBody;
      ctx.fillRect(cx - baseW / 2, y + h - baseH, baseW, baseH);
      ctx.fillRect(cx - baseW * 0.18, y + h - baseH - pillarH, baseW * 0.36, pillarH);
      ctx.fillStyle = PLACEHOLDER_COLORS.pulpitAccent;
      ctx.fillRect(cx - baseW * 0.28, y + h - baseH - pillarH - h * 0.08, baseW * 0.56, h * 0.08);
      break;
    }

    case PlaceholderType.RANKING_MONITOR:
      drawRankingMonitor(ctx, x, y, w, h);
      break;

    case PlaceholderType.REFRACTION_BOOTH:
      drawRefractionBooth(ctx, x, y, w, h);
      break;

    case PlaceholderType.ARENA:
      drawArenaCompact(ctx, x, y, w, h, options.tileSize ?? DESIGN_CONFIG.TILE.SIZE);
      break;

    case PlaceholderType.BUILDING:
      ctx.fillStyle = PLACEHOLDER_COLORS.buildingFill;
      ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
      ctx.strokeStyle = PLACEHOLDER_COLORS.buildingEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + pad + 0.5, y + pad + 0.5, w - pad * 2 - 1, h - pad * 2 - 1);
      break;

    case PlaceholderType.NPC_SPOT: {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const radius = Math.min(w, h) * 0.38;
      ctx.fillStyle = PLACEHOLDER_COLORS.npcFill;
      ctx.strokeStyle = PLACEHOLDER_COLORS.npcEdge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case PlaceholderType.INTERACTIVE_OBJ:
      ctx.fillStyle = PLACEHOLDER_COLORS.interactiveFill;
      ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
      ctx.strokeStyle = PLACEHOLDER_COLORS.interactiveEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + pad + 0.5, y + pad + 0.5, w - pad * 2 - 1, h - pad * 2 - 1);
      break;

    case PlaceholderType.URBAN_PROP: {
      ctx.fillStyle = PLACEHOLDER_COLORS.road;
      ctx.fillRect(x + w * 0.15, y + h - Math.max(3, h * 0.08), w * 0.7, Math.max(3, h * 0.08));
      ctx.fillStyle = PLACEHOLDER_COLORS.urbanConcrete;
      ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2 - Math.max(2, h * 0.06));
      ctx.strokeStyle = PLACEHOLDER_COLORS.urbanMetal;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + pad + 0.5, y + pad + 0.5, w - pad * 2 - 1, h - pad * 2 - Math.max(2, h * 0.06) - 1);
      ctx.fillStyle = PLACEHOLDER_COLORS.urbanNeon;
      ctx.fillRect(x + w * 0.72, y + h * 0.2, Math.max(2, w * 0.06), Math.max(2, h * 0.06));
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

/**
 * Ponto de extensão data-driven — hoje delega ao placeholder; amanhã carrega sprite.
 */
export function renderAsset(
  ctx: CanvasRenderingContext2D,
  assetKey: string,
  x: number,
  y: number,
  options: PlaceholderRenderOptions = {},
): void {
  const { w, h } = resolveSize(options);

  if (drawWorldAssetImage1To1(ctx, assetKey, x, y, w, h)) {
    return;
  }

  const def = PLACEHOLDER_ASSET_REGISTRY[assetKey];
  const type = def?.type ?? PlaceholderType.BUILDING;
  const { label: _canvasLabel, ...drawOptions } = options;
  drawPlaceholder(ctx, type, x, y, {
    ...drawOptions,
    assetKey,
  });
}

export function resolvePlaceholderType(assetKey: string): PlaceholderTypeId {
  return PLACEHOLDER_ASSET_REGISTRY[assetKey]?.type ?? PlaceholderType.BUILDING;
}
