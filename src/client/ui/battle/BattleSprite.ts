/**
 * BattleSprite — slot side-view (aliado ou oponente).
 *
 * Prop monsterId → catálogo de sprites via battleSpriteCatalog.
 */
import {
  DEFAULT_PLAYER_SOUTH_ROTATION_URL,
  PLAYER_ASSET_BUNDLE_ROOT,
} from '../../entities/player/playerConstants.js';
import { getCreatureAssets } from '../../loaders/CreatureAssetLoader.js';
import { isPhaserRuntimeActive } from '../../phaser/phaserRuntimeState.js';
import {
  battleSpriteSrcCandidates,
  resolveBattleSpriteFromMonsterId,
  type BattleSpriteCatalogEntry,
} from './battleSpriteCatalog.js';

const FALLBACK_BATTLE_SPRITE_SRC = DEFAULT_PLAYER_SOUTH_ROTATION_URL;
export type BattleSpriteSide = 'ally' | 'foe';

export type BattleSpriteProps = {
  readonly side: BattleSpriteSide;
  /** Oponente: monsterId do world registry. Aliado: ignorado (usa perfil do jogador). */
  readonly monsterId?: string | null;
};

export class BattleSprite {
  private readonly frame: HTMLElement;
  private readonly side: BattleSpriteSide;
  private img: HTMLImageElement | null = null;
  private silhouette: HTMLElement | null = null;
  private boundMonsterId: string | null = null;
  private boundCreatureId: string | null = null;
  private currentStance: 'idle' | 'attack' = 'idle';

  constructor(frame: HTMLElement, props: BattleSpriteProps) {
    this.frame = frame;
    this.side = props.side;
    this.ensureLayers();
    this.applyProps(props);
  }

  applyProps(props: BattleSpriteProps): void {
    if (this.side === 'foe') {
      this.bindMonsterId(props.monsterId ?? null);
      return;
    }
    this.bindPlayerSprite();
  }

  bindMonsterId(monsterId: string | null): void {
    this.boundMonsterId = monsterId;
    this.frame.dataset.monsterId = monsterId ?? '';
    this.frame.removeAttribute('data-creature-id');

    if (!monsterId) {
      this.clearVisual();
      return;
    }

    const catalog = resolveBattleSpriteFromMonsterId(monsterId);
    if (!catalog) {
      this.clearVisual();
      return;
    }

    this.applyCatalogEntry(catalog);
  }

  getBoundMonsterId(): string | null {
    return this.boundMonsterId;
  }

  getBoundCreatureId(): string | null {
    return this.boundCreatureId;
  }

  /** Troca pose side-view (idle ↔ attack) via CreatureAssetLoader. */
  setStance(stance: 'idle' | 'attack'): void {
    if (this.side !== 'foe' || !this.boundCreatureId) return;
    if (!isPhaserRuntimeActive()) return;
    if (this.currentStance === stance) return;
    this.currentStance = stance;

    const assets = getCreatureAssets(this.boundCreatureId);
    const primary = stance === 'attack' ? assets.sprites.attack : assets.sprites.idle;
    const fallbacks =
      stance === 'attack'
        ? [assets.sprites.idle, FALLBACK_BATTLE_SPRITE_SRC]
        : [assets.sprites.attack, FALLBACK_BATTLE_SPRITE_SRC];
    this.loadSprite(primary, () => this.showSilhouetteOnly(), ...fallbacks);
  }

  clear(): void {
    this.boundMonsterId = null;
    this.boundCreatureId = null;
    this.currentStance = 'idle';
    this.frame.removeAttribute('data-monster-id');
    this.frame.removeAttribute('data-creature-id');
    this.frame.removeAttribute('data-class-id');
    this.frame.removeAttribute('aria-label');
    this.clearVisual();
  }

  private bindPlayerSprite(): void {
    this.boundMonsterId = null;
    this.frame.removeAttribute('data-monster-id');
    this.frame.setAttribute('aria-label', 'Jogador');
    this.showSilhouetteOnly();
    this.loadSprite(
      DEFAULT_PLAYER_SOUTH_ROTATION_URL,
      () => this.showSilhouetteOnly(),
      `${PLAYER_ASSET_BUNDLE_ROOT}/Pixel_art_character_sprite_front/rotations/south.png`,
    );
  }

  private applyCatalogEntry(entry: BattleSpriteCatalogEntry): void {
    this.boundCreatureId = entry.creatureId;
    this.currentStance = 'idle';
    this.frame.dataset.creatureId = entry.creatureId;
    if (entry.classId) this.frame.dataset.classId = entry.classId;
    this.frame.setAttribute('aria-label', entry.name);
    const candidates = battleSpriteSrcCandidates(entry.creatureId);
    const primary = entry.spriteSrc || candidates[0] || FALLBACK_BATTLE_SPRITE_SRC;
    this.loadSprite(primary, () => this.showSilhouetteOnly(), ...candidates.slice(1));
  }

  private ensureLayers(): void {
    this.silhouette = this.frame.querySelector('.battle-portrait__silhouette');
    this.img = this.frame.querySelector('img.battle-portrait__sprite');

    if (!this.img) {
      this.img = this.frame.ownerDocument.createElement('img');
      this.img.className = 'battle-portrait__sprite';
      this.img.alt = '';
      this.img.decoding = 'async';
      this.frame.insertBefore(this.img, this.frame.firstChild);
    }
  }

  private loadSprite(src: string, onError: () => void, ...fallbacks: string[]): void {
    if (!this.img) return;

    const candidates = [src, ...fallbacks];
    const img = this.img;
    let index = 0;

    const tryNext = (): void => {
      const next = candidates[index];
      if (!next) {
        img.classList.add('hidden');
        onError();
        return;
      }
      img.src = next;
    };

    img.onload = () => {
      img.classList.remove('hidden');
      this.silhouette?.classList.add('hidden');
    };
    img.onerror = () => {
      index += 1;
      tryNext();
    };
    tryNext();
  }

  private showSilhouetteOnly(): void {
    this.img?.classList.add('hidden');
    this.silhouette?.classList.remove('hidden');
  }

  private clearVisual(): void {
    if (this.img) {
      this.img.onload = null;
      this.img.onerror = null;
      this.img.removeAttribute('src');
      this.img.classList.add('hidden');
    }
    this.silhouette?.classList.remove('hidden');
  }
}

export function queryBattleSpriteFrames(root: ParentNode = document): {
  ally: HTMLElement | null;
  foe: HTMLElement | null;
} {
  return {
    ally: root.querySelector('#battle-player-portrait'),
    foe: root.querySelector('#battle-opponent-portrait'),
  };
}
