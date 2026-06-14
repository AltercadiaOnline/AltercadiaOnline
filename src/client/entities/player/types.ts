import type { SkinSlotId } from '../../../shared/character/playerSkin.js';
import type { SpriteDirectionKey } from '../../../shared/world/playerFacing.js';

/** Tipos do export metadata.json (v3.0) — layout genérico para troca de assets. */
export type PlayerAssetMetadata = {
  readonly states: readonly {
    readonly character: {
      readonly size: { readonly width: number; readonly height: number };
    };
    readonly frames: {
      readonly rotations: Readonly<Record<string, string>>;
    };
  }[];
};

/** Frame carregado pronto para drawImage. */
export type SpriteFrame = {
  readonly image: HTMLImageElement;
  readonly src: string;
};

/** @deprecated Use SpriteFrame */
export type LoadedSpriteFrame = SpriteFrame;

/** Estados visuais do protagonista no canvas. */
export type AnimationState = 'idle' | 'walk' | 'run' | 'combat';

/** Camadas modulares — ordem de desenho definida em PLAYER_LAYER_RENDER_ORDER. */
export type PlayerLayerSlot = SkinSlotId | 'base' | 'accessories';

export type PlayerLayerDescriptor = {
  readonly slot: PlayerLayerSlot;
  readonly assetId: string;
};

export type PlayerLayerStack = {
  readonly layers: readonly PlayerLayerDescriptor[];
};

export type LayerDrawRect = {
  readonly feetX: number;
  readonly feetY: number;
};

export type PlayerSpriteCatalog = {
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Rotação estática por direção (8-way top-down). */
  readonly rotations: Readonly<Partial<Record<SpriteDirectionKey, SpriteFrame>>>;
};

export type AnimatorSnapshot = {
  readonly state: AnimationState;
  readonly direction: SpriteDirectionKey;
  readonly frameIndex: number;
};
