/**
 * Arena de batalha — pintura Canvas 2D (side-view).
 * Construct = só exploração. HUD React fica por cima; este canvas só desenha.
 *
 * Pronto para frames de ataque futuros via setStance / setCue.
 */
import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import {
  DEFAULT_PLAYER_EAST_ROTATION_URL,
  DEFAULT_PLAYER_SOUTH_ROTATION_URL,
} from '../../entities/player/playerConstants.js';
import type { BattleBackgroundVariant } from '../../../shared/combat/city1BattleBackgroundCatalog.js';
import {
  battleSpriteSrcCandidates,
  resolveBattleSpriteFromMonsterId,
} from './battleSpriteCatalog.js';

export type BattleArenaCue = 'idle' | 'attack' | 'hit' | 'heal' | 'shield' | 'rune';

type FighterSlot = {
  image: HTMLImageElement | null;
  stance: 'idle' | 'attack';
  cue: BattleArenaCue;
  cueUntilMs: number;
  idleSrc: string | null;
  attackSrc: string | null;
  label: string;
};

const VIEW_W = DESIGN_CONFIG.VIEWPORT.WIDTH;
const VIEW_H = DESIGN_CONFIG.VIEWPORT.HEIGHT;

/** Altura máxima do sprite na arena (px no viewport 640×360). */
const FOE_DRAW_H = 168;
const ALLY_DRAW_H = 120;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function loadFirstAvailable(candidates: readonly string[]): Promise<HTMLImageElement | null> {
  for (const src of candidates) {
    if (!src) continue;
    try {
      return await loadImage(src);
    } catch {
      // tenta próximo candidato
    }
  }
  return null;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (w - dw) / 2;
  const dy = h - dh; // ancora no chão (bottom)
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawSpriteBottom(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchorX: number,
  groundY: number,
  maxH: number,
  flash = 0,
): void {
  const scale = maxH / img.naturalHeight;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = anchorX - dw / 2;
  const dy = groundY - dh;

  if (flash > 0) {
    ctx.save();
    ctx.globalAlpha = 0.85 + flash * 0.15;
    ctx.filter = `brightness(${1 + flash * 1.2})`;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // Sombra de contato
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(anchorX, groundY + 4, dw * 0.38, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export class BattleArenaCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private backgroundLayers: HTMLImageElement[] = [];
  private backgroundId = '';
  private readonly ally: FighterSlot = {
    image: null,
    stance: 'idle',
    cue: 'idle',
    cueUntilMs: 0,
    idleSrc: null,
    attackSrc: null,
    label: 'Jogador',
  };
  private readonly foe: FighterSlot = {
    image: null,
    stance: 'idle',
    cue: 'idle',
    cueUntilMs: 0,
    idleSrc: null,
    attackSrc: null,
    label: 'Oponente',
  };
  private rafId = 0;
  private running = false;
  private loadGeneration = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('BattleArenaCanvas: 2d context unavailable');
    this.ctx = ctx;
    this.resizeToDesign();
  }

  resizeToDesign(): void {
    if (this.canvas.width !== VIEW_W || this.canvas.height !== VIEW_H) {
      this.canvas.width = VIEW_W;
      this.canvas.height = VIEW_H;
    }
  }

  startLoop(): void {
    if (this.running) return;
    this.running = true;
    const tick = (): void => {
      if (!this.running) return;
      this.paint();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stopLoop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  clear(): void {
    this.stopLoop();
    this.backgroundLayers = [];
    this.backgroundId = '';
    this.ally.image = null;
    this.foe.image = null;
    this.ally.idleSrc = null;
    this.ally.attackSrc = null;
    this.foe.idleSrc = null;
    this.foe.attackSrc = null;
    this.ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  }

  async applyBackground(variant: BattleBackgroundVariant): Promise<void> {
    const gen = ++this.loadGeneration;
    this.backgroundId = variant.id;
    const layers: HTMLImageElement[] = [];
    for (const url of variant.layers) {
      try {
        layers.push(await loadImage(url));
      } catch {
        // camada opcional — segue sem ela
      }
      if (gen !== this.loadGeneration) return;
    }
    this.backgroundLayers = layers;
    this.paint();
  }

  async bindPlayer(): Promise<void> {
    const gen = this.loadGeneration;
    const img = await loadFirstAvailable([
      DEFAULT_PLAYER_EAST_ROTATION_URL,
      DEFAULT_PLAYER_SOUTH_ROTATION_URL,
    ]);
    if (gen !== this.loadGeneration) return;
    this.ally.image = img;
    this.ally.idleSrc = DEFAULT_PLAYER_EAST_ROTATION_URL;
    this.ally.attackSrc = DEFAULT_PLAYER_EAST_ROTATION_URL;
    this.ally.label = 'Jogador';
    this.ally.stance = 'idle';
    this.paint();
  }

  async bindMonster(monsterId: string | null): Promise<void> {
    const gen = this.loadGeneration;
    if (!monsterId) {
      this.foe.image = null;
      this.foe.idleSrc = null;
      this.foe.attackSrc = null;
      this.paint();
      return;
    }

    const catalog = resolveBattleSpriteFromMonsterId(monsterId);
    if (!catalog) {
      this.foe.image = null;
      this.paint();
      return;
    }

    const candidates = battleSpriteSrcCandidates(catalog.creatureId);
    const primary = catalog.spriteSrc || candidates[0] || '';
    const img = await loadFirstAvailable([primary, ...candidates.slice(1)]);
    if (gen !== this.loadGeneration) return;

    this.foe.image = img;
    this.foe.idleSrc = primary;
    this.foe.attackSrc = catalog.attackSpriteSrc || primary;
    this.foe.label = catalog.name;
    this.foe.stance = 'idle';
    this.paint();
  }

  setStance(side: 'ally' | 'foe', stance: 'idle' | 'attack'): void {
    const slot = side === 'ally' ? this.ally : this.foe;
    if (slot.stance === stance) return;
    slot.stance = stance;
    const src = stance === 'attack' ? slot.attackSrc : slot.idleSrc;
    if (!src) {
      this.paint();
      return;
    }
    void loadImage(src)
      .then((img) => {
        slot.image = img;
        this.paint();
      })
      .catch(() => {
        this.paint();
      });
  }

  triggerCue(side: 'ally' | 'foe', cue: BattleArenaCue, durationMs = 240): void {
    const slot = side === 'ally' ? this.ally : this.foe;
    slot.cue = cue;
    slot.cueUntilMs = performance.now() + durationMs;
    if (cue === 'attack') this.setStance(side, 'attack');
    this.paint();
  }

  getBackgroundId(): string {
    return this.backgroundId;
  }

  private paint(): void {
    const ctx = this.ctx;
    const now = performance.now();
    this.resizeToDesign();

    ctx.fillStyle = '#0b1420';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    for (const layer of this.backgroundLayers) {
      drawCover(ctx, layer, VIEW_W, VIEW_H);
    }

    const groundY = VIEW_H - 36;
    const allyX = VIEW_W * 0.22;
    const foeX = VIEW_W * 0.78;

    // Limpa cues expirados
    for (const slot of [this.ally, this.foe]) {
      if (slot.cue !== 'idle' && now >= slot.cueUntilMs) {
        slot.cue = 'idle';
        if (slot.stance === 'attack') {
          slot.stance = 'idle';
          if (slot.idleSrc) {
            void loadImage(slot.idleSrc).then((img) => {
              slot.image = img;
            });
          }
        }
      }
    }

    const allyFlash = this.ally.cue === 'hit' || this.ally.cue === 'heal' ? 0.7 : 0;
    const foeFlash = this.foe.cue === 'hit' || this.foe.cue === 'heal' ? 0.7 : 0;
    const allyOffset = this.ally.cue === 'attack' || this.ally.stance === 'attack' ? 10 : 0;
    const foeOffset = this.foe.cue === 'attack' || this.foe.stance === 'attack' ? -10 : 0;

    if (this.ally.image) {
      drawSpriteBottom(ctx, this.ally.image, allyX + allyOffset, groundY, ALLY_DRAW_H, allyFlash);
    }
    if (this.foe.image) {
      drawSpriteBottom(ctx, this.foe.image, foeX + foeOffset, groundY, FOE_DRAW_H, foeFlash);
    }
  }
}

export function queryBattleArenaCanvas(root: ParentNode = document): HTMLCanvasElement | null {
  return root.querySelector('#battle-arena-canvas');
}
