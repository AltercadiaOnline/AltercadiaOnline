/**
 * Arena de batalha — pintura Canvas 2D (side-view).
 * Construct = só exploração. HUD React fica por cima; este canvas só desenha.
 *
 * Pronto para frames de ataque futuros via setStance / setCue.
 */
import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import {
  COMBAT_HIT_ANIM_MS,
  COMBAT_STRIKE_DASH_MS,
  COMBAT_STRIKE_RECOVER_MS,
} from '../../../shared/combat/combatSequenceConstants.js';
import {
  BATTLE_ARENA_ALLY_HOME_X,
  BATTLE_ARENA_CONTACT_OFFSET_PX,
  BATTLE_ARENA_FOE_HOME_X,
  BATTLE_ARENA_PET_HOME_X,
  battleStrikeSign,
  resolveBattleFoeDrawHeight,
  resolveBattleFoeGroundDrop,
  resolveBattleFoeHomeXs,
  sampleSmoothPose,
} from './battleArenaPose.js';
import {
  resolveBattlePlayerEastSpriteCandidates,
  resolveBattlePlayerEastSpriteUrl,
} from './battlePlayerSkin.js';
import type { BattleBackgroundVariant } from '../../../shared/combat/city1BattleBackgroundCatalog.js';
import {
  battleSpriteSrcCandidates,
  buildCreatureAttackSpriteSrc,
  resolveBattleSpriteFromMonsterId,
} from './battleSpriteCatalog.js';
import { isPetKindId } from '../../../shared/pet/petCatalog.js';
import { PetSpriteLoader } from '../../entities/pet/PetSpriteLoader.js';
import {
  PET_BATTLE_FACING,
  resolvePetBattleArenaSpriteCandidates,
} from '../../entities/pet/petHudPreview.js';

export type BattleArenaCue = 'idle' | 'attack' | 'hit' | 'heal' | 'shield' | 'rune';

type FighterSlot = {
  image: HTMLImageElement | null;
  stance: 'idle' | 'attack';
  cue: BattleArenaCue;
  cueUntilMs: number;
  idleSrc: string | null;
  attackSrc: string | null;
  label: string;
  actorId: string | null;
  defeated: boolean;
  defeatStartedMs: number;
  poseX: number;
  poseFrom: number;
  poseTo: number;
  poseStartMs: number;
  poseDurationMs: number;
  /** Geração de load própria do slot — bind novo invalida o anterior sem afetar o resto. */
  generation: number;
};

function emptyFighterSlot(label: string): FighterSlot {
  return {
    image: null,
    stance: 'idle',
    cue: 'idle',
    cueUntilMs: 0,
    idleSrc: null,
    attackSrc: null,
    label,
    actorId: null,
    defeated: false,
    defeatStartedMs: 0,
    poseX: 0,
    poseFrom: 0,
    poseTo: 0,
    poseStartMs: 0,
    poseDurationMs: 0,
    generation: 0,
  };
}

const VIEW_W = DESIGN_CONFIG.VIEWPORT.WIDTH;
const VIEW_H = DESIGN_CONFIG.VIEWPORT.HEIGHT;

/** Altura máxima do sprite inimigo na arena (px no viewport 640×360). */
const FOE_DRAW_H = 160;
/** Jogador ~30% menor que a criatura — evita esticar e harmoniza side-view. */
const ALLY_DRAW_H = Math.round(FOE_DRAW_H * 0.7);
/** Pet coadjuvante — PNG east (olhando à direita), menor que o player. */
const PET_DRAW_H = Math.round(ALLY_DRAW_H * 0.62);
/** Mesma linha de chão; player sobe um pouco para alinhar com o pé da criatura (arte com padding). */
const GROUND_Y = VIEW_H - 40;
const ALLY_GROUND_LIFT = 14;
/** Pet fica à esquerda e um pouco abaixo do player. */
const PET_GROUND_DROP = 10;
const DEFEATED_TINT = 'rgba(176, 16, 24, 0.78)';
const DEFEATED_HIT_TINT = 'rgba(224, 36, 42, 0.88)';

let spriteTintScratch: HTMLCanvasElement | null = null;
let spriteTintScratchCtx: CanvasRenderingContext2D | null = null;

function getSpriteTintScratch(width: number, height: number): CanvasRenderingContext2D {
  const w = Math.max(1, Math.ceil(width));
  const h = Math.max(1, Math.ceil(height));
  if (!spriteTintScratch || !spriteTintScratchCtx) {
    spriteTintScratch = document.createElement('canvas');
    const ctx = spriteTintScratch.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('BattleArenaCanvas: tint scratch unavailable');
    spriteTintScratchCtx = ctx;
  }
  if (spriteTintScratch.width !== w || spriteTintScratch.height !== h) {
    spriteTintScratch.width = w;
    spriteTintScratch.height = h;
  } else {
    spriteTintScratchCtx.clearRect(0, 0, w, h);
  }
  spriteTintScratchCtx.setTransform(1, 0, 0, 1, 0, 0);
  spriteTintScratchCtx.globalCompositeOperation = 'source-over';
  spriteTintScratchCtx.globalAlpha = 1;
  spriteTintScratchCtx.imageSmoothingEnabled = false;
  return spriteTintScratchCtx;
}

function drawSpriteBottom(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchorX: number,
  groundY: number,
  maxH: number,
  flash = 0,
  defeated = false,
): void {
  const scale = maxH / img.naturalHeight;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = anchorX - dw / 2;
  const dy = groundY - dh;

  ctx.save();
  if (defeated) {
    const off = getSpriteTintScratch(dw, dh);
    off.clearRect(0, 0, off.canvas.width, off.canvas.height);
    off.drawImage(img, 0, 0, dw, dh);
    off.globalCompositeOperation = 'source-atop';
    off.fillStyle = flash > 0 ? DEFEATED_HIT_TINT : DEFEATED_TINT;
    off.fillRect(0, 0, off.canvas.width, off.canvas.height);
    off.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = flash > 0 ? 0.96 : 0.9;
    ctx.drawImage(off.canvas, dx, dy);
  } else if (flash > 0) {
    ctx.globalAlpha = 0.85 + flash * 0.15;
    ctx.filter = `brightness(${1 + flash * 1.2})`;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  ctx.restore();

  // Sombra de contato
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(anchorX, groundY + 4, dw * 0.38, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

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

function drawBackgroundFill(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
): void {
  ctx.drawImage(img, 0, 0, w, h);
}

export class BattleArenaCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly backgroundCanvas: HTMLCanvasElement | null;
  private readonly backgroundCtx: CanvasRenderingContext2D | null;
  private backgroundLayers: HTMLImageElement[] = [];
  private backgroundId = '';
  private readonly ally: FighterSlot = emptyFighterSlot('Jogador');
  private foes: FighterSlot[] = [emptyFighterSlot('Oponente')];
  private boundCreatureId: string | null = null;
  private onFoePicked: ((actorId: string) => void) | null = null;
  private pet: {
    image: HTMLImageElement | null;
    kindId: string | null;
    generation: number;
  } = {
    image: null,
    kindId: null,
    generation: 0,
  };
  private rafId = 0;
  private running = false;
  private backgroundGeneration = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('BattleArenaCanvas: 2d context unavailable');
    this.ctx = ctx;
    this.backgroundCanvas =
      canvas.closest('.battle-stage-frame')
        ?.querySelector<HTMLCanvasElement>('#battle-background-canvas')
      ?? null;
    this.backgroundCtx = this.backgroundCanvas?.getContext('2d', { alpha: false }) ?? null;
    this.resizeToDesign();
    this.canvas.addEventListener('click', this.handleCanvasClick);
  }

  setOnFoePicked(handler: ((actorId: string) => void) | null): void {
    this.onFoePicked = handler;
  }

  resizeToDesign(): void {
    if (this.canvas.width !== VIEW_W || this.canvas.height !== VIEW_H) {
      this.canvas.width = VIEW_W;
      this.canvas.height = VIEW_H;
    }
    if (
      this.backgroundCanvas
      && (this.backgroundCanvas.width !== VIEW_W || this.backgroundCanvas.height !== VIEW_H)
    ) {
      this.backgroundCanvas.width = VIEW_W;
      this.backgroundCanvas.height = VIEW_H;
    }
  }

  startLoop(): void {
    if (this.running) return;
    this.running = true;
    const tick = (): void => {
      if (!this.running) return;
      try {
        this.paint();
      } catch (error) {
        console.warn('[BattleArenaCanvas] paint falhou:', error);
      }
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
    this.backgroundGeneration += 1;
    this.ally.generation += 1;
    for (const foe of this.foes) foe.generation += 1;
    this.pet.generation += 1;
    this.backgroundLayers = [];
    this.backgroundId = '';
    this.boundCreatureId = null;
    this.ally.image = null;
    this.pet.image = null;
    this.pet.kindId = null;
    this.ally.idleSrc = null;
    this.ally.attackSrc = null;
    this.snapHome(this.ally);
    this.resetFoePack(1);
    this.ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.backgroundCtx?.clearRect(0, 0, VIEW_W, VIEW_H);
  }

  async applyBackground(variant: BattleBackgroundVariant): Promise<void> {
    const gen = ++this.backgroundGeneration;
    this.backgroundId = variant.id;
    const layers: HTMLImageElement[] = [];
    for (const url of variant.layers) {
      try {
        layers.push(await loadImage(url));
      } catch {
        // camada opcional — segue sem ela
      }
      if (gen !== this.backgroundGeneration) return;
    }
    this.backgroundLayers = layers;
    this.paint();
  }

  async bindPlayer(): Promise<void> {
    const gen = ++this.ally.generation;
    const candidates = resolveBattlePlayerEastSpriteCandidates();
    const img = await loadFirstAvailable(candidates);
    if (gen !== this.ally.generation) return;
    if (!img) {
      console.warn('[BattleArenaCanvas] Sprite do player não carregou (skin east):', candidates);
    }
    const eastUrl = resolveBattlePlayerEastSpriteUrl();
    this.ally.image = img;
    this.ally.idleSrc = eastUrl;
    this.ally.attackSrc = eastUrl;
    this.ally.label = 'Jogador';
    this.ally.stance = 'idle';
    this.snapHome(this.ally);
    this.paint();
  }

  async bindPet(kindId: string | null): Promise<void> {
    if (!kindId || !isPetKindId(kindId)) {
      this.pet.generation += 1;
      this.pet.image = null;
      this.pet.kindId = null;
      this.paint();
      return;
    }
    if (this.pet.kindId === kindId && this.pet.image) {
      this.paint();
      return;
    }

    const gen = ++this.pet.generation;
    const fromCatalog = await PetSpriteLoader.loadFacingImage(kindId, PET_BATTLE_FACING);
    const img = fromCatalog
      ?? await loadFirstAvailable(resolvePetBattleArenaSpriteCandidates(kindId));
    if (gen !== this.pet.generation) return;
    if (!img) {
      console.warn('[BattleArenaCanvas] Sprite do pet não carregou (east):', kindId);
    }
    this.pet.kindId = kindId;
    this.pet.image = img;
    this.paint();
  }

  async bindMonster(monsterId: string | null): Promise<void> {
    if (!monsterId) {
      this.boundCreatureId = null;
      this.resetFoePack(1);
      this.paint();
      return;
    }

    const catalog = resolveBattleSpriteFromMonsterId(monsterId);
    if (!catalog) {
      // Registry pode já ter removido o bicho do mundo ao entrar em batalha —
      // caller deve preferir bindCreature(creatureId) via encontro ativo.
      console.warn('[BattleArenaCanvas] monsterId sem entrada no registry:', monsterId);
      this.boundCreatureId = null;
      this.resetFoePack(1);
      this.paint();
      return;
    }

    await this.bindCreature(catalog.creatureId, catalog.name);
  }

  /** Bind direto por creatureId — assets de public/assets/creatures/zona1_tela_de_batalha. */
  async bindCreature(creatureId: string, label?: string): Promise<void> {
    const actorIds = (this.foes ?? []).map((slot) => slot.actorId);
    await this.bindCreaturePack(creatureId, actorIds.length > 0 ? actorIds : [null], label);
  }

  /**
   * Um PNG, N sprites. Recicla a imagem se o creatureId não mudou.
   * `actorIds` vêm do snapshot autoritativo (`enemy_rat`, `enemy_rat__1`, …).
   */
  async bindCreaturePack(
    creatureId: string,
    actorIds: readonly (string | null)[],
    label?: string,
  ): Promise<void> {
    const packSize = Math.max(1, Math.min(3, actorIds.length || 1));
    const ids = Array.from({ length: packSize }, (_, index) => actorIds[index] ?? null);

    if (this.boundCreatureId === creatureId && this.foes[0]?.image && this.foes.length === packSize) {
      for (let index = 0; index < packSize; index += 1) {
        const slot = this.foes[index];
        if (!slot) continue;
        slot.actorId = ids[index] ?? null;
        slot.label = label ?? creatureId;
      }
      this.paint();
      return;
    }

    if (!creatureId) {
      console.warn('[BattleArenaCanvas] bindCreature sem creatureId — arena sem sprite do inimigo.');
      this.boundCreatureId = null;
      this.resetFoePack(packSize, ids);
      this.paint();
      return;
    }

    this.resetFoePack(packSize, ids);
    const packGen = this.foes[0]?.generation ?? 0;
    const candidates = battleSpriteSrcCandidates(creatureId);
    const primary = candidates[0] || '';
    const img = await loadFirstAvailable(candidates);
    if ((this.foes[0]?.generation ?? 0) !== packGen) return;
    if (!img) {
      console.warn('[BattleArenaCanvas] Sprite da criatura não carregou:', creatureId, candidates);
    }

    const attackSrc = buildCreatureAttackSpriteSrc(creatureId) || primary;
    this.boundCreatureId = creatureId;
    for (let index = 0; index < this.foes.length; index += 1) {
      const slot = this.foes[index];
      if (!slot) continue;
      slot.image = img;
      slot.idleSrc = primary;
      slot.attackSrc = attackSrc;
      slot.label = label ?? creatureId;
      slot.actorId = ids[index] ?? null;
      slot.stance = 'idle';
      this.snapHome(slot);
    }
    this.paint();
  }

  syncFoeDefeat(states: ReadonlyArray<{ readonly actorId: string; readonly defeated: boolean }>): void {
    if (states.length === 0) return;
    const now = performance.now();
    for (const slot of this.foes) {
      if (!slot.actorId) continue;
      const next = states.find((entry) => entry.actorId === slot.actorId);
      if (!next) continue;
      if (next.defeated && !slot.defeated) {
        slot.defeatStartedMs = now;
        slot.cue = 'hit';
        slot.cueUntilMs = Number.POSITIVE_INFINITY;
      }
      if (!next.defeated) {
        slot.defeatStartedMs = 0;
        if (slot.cueUntilMs === Number.POSITIVE_INFINITY) {
          slot.cue = 'idle';
          slot.cueUntilMs = 0;
        }
      }
      slot.defeated = next.defeated;
    }
    this.paint();
  }

  setStance(side: 'ally' | 'foe', stance: 'idle' | 'attack', actorId?: string): void {
    const slot = this.resolveSlot(side, actorId);
    if (!slot) return;
    slot.stance = stance;
    if (stance === 'idle') {
      this.beginPose(slot, 0, COMBAT_STRIKE_RECOVER_MS);
    }
    this.applyStanceImage(slot);
    this.paint();
  }

  triggerCue(
    side: 'ally' | 'foe',
    cue: BattleArenaCue,
    durationMs = COMBAT_HIT_ANIM_MS,
    actorId?: string,
  ): void {
    const slot = this.resolveSlot(side, actorId);
    if (!slot) return;
    slot.cue = cue;
    slot.cueUntilMs = performance.now() + Math.max(0, durationMs);
    if (cue === 'attack') {
      slot.stance = 'attack';
      this.applyStanceImage(slot);
      this.beginPose(
        slot,
        battleStrikeSign(side) * BATTLE_ARENA_CONTACT_OFFSET_PX,
        COMBAT_STRIKE_DASH_MS,
      );
    }
    this.paint();
  }

  private handleCanvasClick = (event: MouseEvent): void => {
    if (!this.onFoePicked || this.foes.length < 2) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
    const actorId = this.hitTestFoe(x);
    if (actorId) this.onFoePicked(actorId);
  };

  private hitTestFoe(canvasX: number): string | null {
    const homes = resolveBattleFoeHomeXs(this.foes.length);
    let bestId: string | null = null;
    let bestDist = 48;
    for (let index = 0; index < this.foes.length; index += 1) {
      const homeX = homes[index] ?? BATTLE_ARENA_FOE_HOME_X;
      const dist = Math.abs(canvasX - homeX);
      const slot = this.foes[index];
      if (!slot || slot.defeated) continue;
      const actorId = slot.actorId;
      if (actorId && dist < bestDist) {
        bestDist = dist;
        bestId = actorId;
      }
    }
    return bestId;
  }

  private resetFoePack(packSize: number, actorIds: readonly (string | null)[] = []): void {
    const previous = this.foes ?? [];
    for (const foe of previous) foe.generation += 1;
    const nextGen = (previous[0]?.generation ?? 0) + 1;
    this.foes = Array.from({ length: Math.max(1, packSize) }, (_, index) => {
      const slot = emptyFighterSlot('Oponente');
      slot.actorId = actorIds[index] ?? null;
      slot.generation = nextGen;
      this.snapHome(slot);
      return slot;
    });
  }

  private resolveSlot(side: 'ally' | 'foe', actorId?: string): FighterSlot | null {
    if (side === 'ally') return this.ally;
    if (actorId) {
      const matched = this.foes.find((slot) => slot.actorId === actorId);
      if (matched) return matched;
    }
    return this.foes[0] ?? null;
  }

  private snapHome(slot: FighterSlot): void {
    slot.poseX = 0;
    slot.poseFrom = 0;
    slot.poseTo = 0;
    slot.poseStartMs = 0;
    slot.poseDurationMs = 0;
  }

  private beginPose(slot: FighterSlot, to: number, durationMs: number): void {
    const now = performance.now();
    slot.poseFrom = slot.poseX;
    slot.poseTo = to;
    slot.poseStartMs = now;
    slot.poseDurationMs = Math.max(0, durationMs);
  }

  private tickPose(slot: FighterSlot, now: number): void {
    const sampled = sampleSmoothPose(
      slot.poseFrom,
      slot.poseTo,
      slot.poseStartMs,
      slot.poseDurationMs,
      now,
    );
    slot.poseX = sampled.x;
    if (sampled.done) {
      slot.poseX = slot.poseTo;
      slot.poseFrom = slot.poseTo;
      slot.poseDurationMs = 0;
    }
  }

  private applyStanceImage(slot: FighterSlot): void {
    const src = slot.stance === 'attack' ? slot.attackSrc : slot.idleSrc;
    if (!src) return;
    const gen = slot.generation;
    const wanted = slot.stance;
    void loadImage(src)
      .then((img) => {
        if (slot.generation !== gen || slot.stance !== wanted) return;
        slot.image = img;
      })
      .catch(() => undefined);
  }

  getBackgroundId(): string {
    return this.backgroundId;
  }

  private paint(): void {
    const ctx = this.ctx;
    const backgroundCtx = this.backgroundCtx;
    const now = performance.now();
    this.resizeToDesign();

    if (backgroundCtx) {
      backgroundCtx.fillStyle = '#0b1420';
      backgroundCtx.fillRect(0, 0, VIEW_W, VIEW_H);
      for (const layer of this.backgroundLayers) {
        drawBackgroundFill(backgroundCtx, layer, VIEW_W, VIEW_H);
      }
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    } else {
      ctx.fillStyle = '#0b1420';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      for (const layer of this.backgroundLayers) {
        drawBackgroundFill(ctx, layer, VIEW_W, VIEW_H);
      }
    }

    const groundY = GROUND_Y;
    const allyGroundY = GROUND_Y - ALLY_GROUND_LIFT;
    const allyX = BATTLE_ARENA_ALLY_HOME_X;
    const petX = BATTLE_ARENA_PET_HOME_X;
    const foes = this.foes ?? [];
    const packSize = Math.max(1, foes.length);
    const foeHomes = resolveBattleFoeHomeXs(packSize);
    const foeDrawH = resolveBattleFoeDrawHeight(packSize);

    this.tickExpiredCues(this.ally, now);
    this.tickPose(this.ally, now);
    for (const slot of foes) {
      this.tickExpiredCues(slot, now);
      this.tickPose(slot, now);
    }

    const allyFlash = this.ally.cue === 'hit' || this.ally.cue === 'heal' ? 0.7 : 0;

    if (this.pet.image) {
      drawSpriteBottom(
        ctx,
        this.pet.image,
        petX,
        allyGroundY + PET_GROUND_DROP,
        PET_DRAW_H,
      );
    }
    if (this.ally.image) {
      drawSpriteBottom(ctx, this.ally.image, allyX + this.ally.poseX, allyGroundY, ALLY_DRAW_H, allyFlash);
    }
    const foeOrder = foes.map((_, index) => index).sort((a, b) => {
      const downA = foes[a]?.defeated ? 0 : 1;
      const downB = foes[b]?.defeated ? 0 : 1;
      return downA - downB;
    });
    for (const index of foeOrder) {
      const slot = foes[index];
      if (!slot?.image) continue;
      const hitFlash = slot.defeated || slot.cue === 'hit' || slot.cue === 'heal' ? 0.7 : 0;
      drawSpriteBottom(
        ctx,
        slot.image,
        (foeHomes[index] ?? BATTLE_ARENA_FOE_HOME_X) + slot.poseX,
        groundY + resolveBattleFoeGroundDrop(packSize, index),
        foeDrawH,
        hitFlash,
        slot.defeated,
      );
    }
  }

  private tickExpiredCues(slot: FighterSlot, now: number): void {
    if (slot.defeated && slot.cue === 'hit') return;
    if (slot.cue !== 'idle' && now >= slot.cueUntilMs) {
      slot.cue = 'idle';
    }
  }
}

export function queryBattleArenaCanvas(root: ParentNode = document): HTMLCanvasElement | null {
  return root.querySelector('#battle-arena-canvas');
}
