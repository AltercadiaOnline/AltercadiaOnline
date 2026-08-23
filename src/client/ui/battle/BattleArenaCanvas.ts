/**
 * Arena de batalha — pintura Canvas 2D (side-view).
 * Construct = só exploração. HUD React fica por cima; este canvas só desenha.
 *
 * Pronto para frames de ataque futuros via setStance / setCue.
 */
import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { shouldSkipRenderFrame } from '../../runtime/performancePreset.js';
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
import {
  resolveBattleFighterSkinBundleId,
  resolveBattleSkinFacingCandidates,
  resolveBattleSkinFacingUrl,
} from './battleClassSprite.js';
import { resolvePvpFighterDrawHeight, resolvePvpFighterFootPadPx } from './battlePvpSkinDrawScale.js';
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
  /** Skin do personagem — escala PvP (male_1 = âncora). */
  skinBundleId: string | null;
  defeated: boolean;
  defeatStartedMs: number;
  poseX: number;
  poseFrom: number;
  poseTo: number;
  poseStartMs: number;
  poseDurationMs: number;
  /** 1 = olha direita; -1 = espelha (olha esquerda). */
  facingScale: 1 | -1;
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
    skinBundleId: null,
    defeated: false,
    defeatStartedMs: 0,
    poseX: 0,
    poseFrom: 0,
    poseTo: 0,
    poseStartMs: 0,
    poseDurationMs: 0,
    facingScale: 1,
    generation: 0,
  };
}

const VIEW_W = DESIGN_CONFIG.VIEWPORT.WIDTH;
const VIEW_H = DESIGN_CONFIG.VIEWPORT.HEIGHT;

/** Altura máxima do sprite inimigo na arena (px no viewport 640×360). */
const FOE_DRAW_H = 160;
/** Jogador ~30% menor que a criatura — evita esticar e harmoniza side-view. */
const ALLY_DRAW_H = Math.round(FOE_DRAW_H * 0.7);
/** Duelo PvP: os dois do mesmo tamanho (contrato casual/rankeado). */
const PVP_FIGHTER_DRAW_H = Math.round((ALLY_DRAW_H + FOE_DRAW_H) / 2);
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
  facingScale: 1 | -1 = 1,
  /** Padding sob os pés no PNG — desce o sprite; sombra fica no groundY. */
  footPadPx = 0,
): void {
  const scale = maxH / img.naturalHeight;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = anchorX - dw / 2;
  const dy = groundY - dh + Math.max(0, footPadPx);

  ctx.save();
  if (facingScale === -1) {
    ctx.translate(anchorX, 0);
    ctx.scale(-1, 1);
    ctx.translate(-anchorX, 0);
  }
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
    img.onload = () => {
      // Soft-404 HTML (SPA) dispara onload com frame inválido — rejeita.
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error(`Invalid image ${src}`));
        return;
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

type LoadedSprite = {
  readonly image: HTMLImageElement;
  readonly src: string;
};

async function loadFirstAvailable(candidates: readonly string[]): Promise<LoadedSprite | null> {
  for (const src of candidates) {
    if (!src) continue;
    try {
      const image = await loadImage(src);
      return { image, src };
    } catch {
      // tenta próximo candidato
    }
  }
  return null;
}

function drawPvpPlaceholder(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  groundY: number,
  maxH: number,
  label: string,
  facing: 'east' | 'west',
): void {
  const dw = Math.round(maxH * 0.55);
  const dh = maxH;
  const dx = anchorX - dw / 2;
  const dy = groundY - dh;
  ctx.save();
  ctx.fillStyle = 'rgba(40, 58, 82, 0.92)';
  ctx.strokeStyle = 'rgba(180, 210, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.fillRect(dx, dy, dw, dh);
  ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
  // Seta de facing provisória
  ctx.fillStyle = 'rgba(220, 235, 255, 0.95)';
  const midY = dy + dh * 0.42;
  if (facing === 'east') {
    ctx.beginPath();
    ctx.moveTo(dx + dw * 0.25, midY - 8);
    ctx.lineTo(dx + dw * 0.75, midY);
    ctx.lineTo(dx + dw * 0.25, midY + 8);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(dx + dw * 0.75, midY - 8);
    ctx.lineTo(dx + dw * 0.25, midY);
    ctx.lineTo(dx + dw * 0.75, midY + 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(230, 240, 255, 0.9)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText((label || '?').slice(0, 10), anchorX, groundY + 14);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(anchorX, groundY + 4, dw * 0.38, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
  /** Chave do duelo PvP já ligado (evita reload a cada sync). */
  private boundPvpKey: string | null = null;
  /** true = desenha ally/foe com o mesmo tamanho (duelo humano). */
  private pvpDuelMode = false;
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
    let lastPaintMs = 0;
    const tick = (nowMs: number): void => {
      if (!this.running) return;
      if (!shouldSkipRenderFrame(lastPaintMs, nowMs)) {
        lastPaintMs = nowMs;
        try {
          this.paint();
        } catch (error) {
          console.warn('[BattleArenaCanvas] paint falhou:', error);
        }
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
    this.boundPvpKey = null;
    this.pvpDuelMode = false;
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

  /**
   * Mount PvP: limpa slots sem ativar bindPlayer (que derrubava pvpDuelMode / foe).
   * bindPvpDuel preenche os dois lados no próximo sync.
   */
  preparePvpArenaMount(): void {
    this.boundCreatureId = null;
    this.boundPvpKey = null;
    this.pvpDuelMode = true;
    this.ally.generation += 1;
    this.ally.image = null;
    this.resetFoePack(1);
    this.pet.generation += 1;
    this.pet.image = null;
    this.pet.kindId = null;
    this.paint();
  }

  /** true se o duelo com esta chave já tem ally + foe carregados. */
  isPvpDuelBound(key: string): boolean {
    return (
      this.pvpDuelMode
      && this.boundPvpKey === key
      && Boolean(this.ally.image)
      && Boolean(this.foes[0]?.image)
    );
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
    this.pvpDuelMode = false;
    this.boundPvpKey = null;
    const gen = ++this.ally.generation;
    const candidates = resolveBattlePlayerEastSpriteCandidates();
    const loaded = await loadFirstAvailable(candidates);
    if (gen !== this.ally.generation) return;
    if (!loaded) {
      console.warn('[BattleArenaCanvas] Sprite do player não carregou (skin east):', candidates);
    }
    const eastUrl = loaded?.src ?? resolveBattlePlayerEastSpriteUrl();
    this.ally.image = loaded?.image ?? null;
    this.ally.idleSrc = eastUrl;
    this.ally.attackSrc = eastUrl;
    this.ally.label = 'Jogador';
    this.ally.stance = 'idle';
    this.ally.facingScale = 1;
    this.snapHome(this.ally);
    this.paint();
  }

  /**
   * Duelo humano (casual / rankeado): eu à esquerda (east) · oponente à direita (west).
   * Skin = bundle do personagem (mapa hoje; `battle/` no futuro).
   */
  async bindPvpDuel(input: {
    readonly allyClassId: string | null | undefined;
    readonly allySkinBundleId?: string | null | undefined;
    readonly allyLabel: string;
    readonly foeClassId: string | null | undefined;
    readonly foeSkinBundleId?: string | null | undefined;
    readonly foeLabel: string;
    readonly foeActorId: string;
  }): Promise<void> {
    const key = [
      input.allySkinBundleId ?? '',
      input.allyClassId ?? '',
      input.foeSkinBundleId ?? '',
      input.foeClassId ?? '',
      input.foeActorId,
      input.allyLabel,
      input.foeLabel,
    ].join('|');
    if (this.boundPvpKey === key && this.ally.image && this.foes[0]?.image) {
      this.pvpDuelMode = true;
      this.paint();
      return;
    }

    this.pvpDuelMode = true;
    this.boundCreatureId = null;
    this.boundPvpKey = key;
    this.resetFoePack(1, [input.foeActorId]);

    console.info('[BattleArenaCanvas] bindPvpDuel start', {
      allyClassId: input.allyClassId,
      allySkinBundleId: input.allySkinBundleId,
      foeClassId: input.foeClassId,
      foeSkinBundleId: input.foeSkinBundleId,
      foeActorId: input.foeActorId,
      allyLabel: input.allyLabel,
      foeLabel: input.foeLabel,
      allyCandidates: resolveBattleSkinFacingCandidates(
        input.allySkinBundleId,
        'east',
        input.allyClassId,
      ),
      foeCandidates: resolveBattleSkinFacingCandidates(
        input.foeSkinBundleId,
        'west',
        input.foeClassId,
      ),
    });

    const allyGen = ++this.ally.generation;
    const foe = this.foes[0]!;
    // resetFoePack já avançou generation — não incrementar de novo (evita race com paint).
    const foeGen = foe.generation;

    const allyCandidates = resolveBattleSkinFacingCandidates(
      input.allySkinBundleId,
      'east',
      input.allyClassId,
    );
    // Oponente: prioriza west; se só existir east, flip via facingScale.
    const foeCandidates = resolveBattleSkinFacingCandidates(
      input.foeSkinBundleId,
      'west',
      input.foeClassId,
    );
    const [allyLoaded, foeLoaded] = await Promise.all([
      loadFirstAvailable(allyCandidates),
      loadFirstAvailable(foeCandidates),
    ]);

    if (allyGen === this.ally.generation) {
      if (!allyLoaded) {
        console.warn('[BattleArenaCanvas] Sprite PvP ally não carregou:', allyCandidates);
      }
      const allyUrl = allyLoaded?.src
        ?? resolveBattleSkinFacingUrl(input.allySkinBundleId, 'east', input.allyClassId);
      this.ally.image = allyLoaded?.image ?? null;
      this.ally.idleSrc = allyUrl;
      this.ally.attackSrc = allyUrl;
      this.ally.label = input.allyLabel;
      this.ally.skinBundleId = resolveBattleFighterSkinBundleId({
        skinBundleId: input.allySkinBundleId,
        classId: input.allyClassId,
      });
      this.ally.stance = 'idle';
      this.ally.facingScale = 1;
      this.snapHome(this.ally);
    }

    if (foeGen === foe.generation) {
      if (!foeLoaded) {
        console.warn('[BattleArenaCanvas] Sprite PvP foe não carregou:', foeCandidates);
      }
      const foeUrl = foeLoaded?.src
        ?? resolveBattleSkinFacingUrl(input.foeSkinBundleId, 'west', input.foeClassId);
      foe.image = foeLoaded?.image ?? null;
      foe.idleSrc = foeUrl;
      foe.attackSrc = foeUrl;
      foe.label = input.foeLabel;
      foe.actorId = input.foeActorId;
      foe.skinBundleId = resolveBattleFighterSkinBundleId({
        skinBundleId: input.foeSkinBundleId,
        classId: input.foeClassId,
      });
      foe.stance = 'idle';
      // west.png = -1 desnecessário; east fallback = flip horizontal.
      const usedEastFallback = Boolean(foeLoaded?.src.includes('/east.png'));
      foe.facingScale = usedEastFallback ? -1 : 1;
      foe.defeated = false;
      this.snapHome(foe);
    }

    console.info('[BattleArenaCanvas] bindPvpDuel done', {
      foeActorId: input.foeActorId,
      allyLoaded: Boolean(this.ally.image),
      foeLoaded: Boolean(this.foes[0]?.image),
      allySrc: this.ally.idleSrc,
      foeSrc: this.foes[0]?.idleSrc ?? null,
    });

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
    const fallback = fromCatalog
      ? null
      : await loadFirstAvailable(resolvePetBattleArenaSpriteCandidates(kindId));
    if (gen !== this.pet.generation) return;
    const img = fromCatalog ?? fallback?.image ?? null;
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
    this.pvpDuelMode = false;
    this.boundPvpKey = null;
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
    const loaded = await loadFirstAvailable(candidates);
    if ((this.foes[0]?.generation ?? 0) !== packGen) return;
    if (!loaded) {
      console.warn('[BattleArenaCanvas] Sprite da criatura não carregou:', creatureId, candidates);
    }

    const idleSrc = loaded?.src ?? primary;
    const attackSrc = buildCreatureAttackSpriteSrc(creatureId) || idleSrc;
    this.boundCreatureId = creatureId;
    for (let index = 0; index < this.foes.length; index += 1) {
      const slot = this.foes[index];
      if (!slot) continue;
      slot.image = loaded?.image ?? null;
      slot.idleSrc = idleSrc;
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
    const allyGroundY = this.pvpDuelMode ? GROUND_Y - 8 : GROUND_Y - ALLY_GROUND_LIFT;
    const allyX = BATTLE_ARENA_ALLY_HOME_X;
    const petX = BATTLE_ARENA_PET_HOME_X;
    const foes = this.foes ?? [];
    const packSize = Math.max(1, foes.length);
    const foeHomes = resolveBattleFoeHomeXs(packSize);
    const allyDrawH = this.pvpDuelMode
      ? resolvePvpFighterDrawHeight(PVP_FIGHTER_DRAW_H, this.ally.skinBundleId)
      : ALLY_DRAW_H;
    const foeDrawHBase = this.pvpDuelMode
      ? PVP_FIGHTER_DRAW_H
      : resolveBattleFoeDrawHeight(packSize);
    const foeGroundY = this.pvpDuelMode ? allyGroundY : groundY;

    this.tickExpiredCues(this.ally, now);
    this.tickPose(this.ally, now);
    for (const slot of foes) {
      this.tickExpiredCues(slot, now);
      this.tickPose(slot, now);
    }

    const allyFlash = this.ally.cue === 'hit' || this.ally.cue === 'heal' ? 0.7 : 0;

    if (this.pet.image && !this.pvpDuelMode) {
      drawSpriteBottom(
        ctx,
        this.pet.image,
        petX,
        allyGroundY + PET_GROUND_DROP,
        PET_DRAW_H,
      );
    } else if (this.pet.image && this.pvpDuelMode) {
      drawSpriteBottom(
        ctx,
        this.pet.image,
        petX,
        allyGroundY + PET_GROUND_DROP,
        Math.round(PVP_FIGHTER_DRAW_H * 0.55),
      );
    }
    if (this.ally.image) {
      drawSpriteBottom(
        ctx,
        this.ally.image,
        allyX + this.ally.poseX,
        allyGroundY,
        allyDrawH,
        allyFlash,
        false,
        this.ally.facingScale,
        this.pvpDuelMode
          ? resolvePvpFighterFootPadPx(allyDrawH, this.ally.skinBundleId)
          : 0,
      );
    } else if (this.pvpDuelMode) {
      drawPvpPlaceholder(
        ctx,
        allyX + this.ally.poseX,
        allyGroundY,
        allyDrawH,
        this.ally.label,
        'east',
      );
    }
    const foeOrder = foes.map((_, index) => index).sort((a, b) => {
      const downA = foes[a]?.defeated ? 0 : 1;
      const downB = foes[b]?.defeated ? 0 : 1;
      return downA - downB;
    });
    for (const index of foeOrder) {
      const slot = foes[index];
      if (!slot) continue;
      const homeX = (foeHomes[index] ?? BATTLE_ARENA_FOE_HOME_X) + slot.poseX;
      const y = foeGroundY + (this.pvpDuelMode ? 0 : resolveBattleFoeGroundDrop(packSize, index));
      const foeDrawH = this.pvpDuelMode
        ? resolvePvpFighterDrawHeight(foeDrawHBase, slot.skinBundleId)
        : foeDrawHBase;
      if (!slot.image) {
        if (this.pvpDuelMode) {
          drawPvpPlaceholder(ctx, homeX, y, foeDrawH, slot.label, 'west');
        }
        continue;
      }
      const hitFlash = slot.defeated || slot.cue === 'hit' || slot.cue === 'heal' ? 0.7 : 0;
      drawSpriteBottom(
        ctx,
        slot.image,
        homeX,
        y,
        foeDrawH,
        hitFlash,
        slot.defeated,
        slot.facingScale,
        this.pvpDuelMode
          ? resolvePvpFighterFootPadPx(foeDrawH, slot.skinBundleId)
          : 0,
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
