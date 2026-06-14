import {
  createDefaultPlayerSkin,
  type PlayerSkin,
} from '../../../shared/character/playerSkin.js';
import {
  buildOrderedLayerDescriptors,
  layerCacheKey,
  PlayerSpriteLoader,
} from './PlayerSpriteLoader.js';
import type { LayerDrawRect, PlayerLayerDescriptor } from './types.js';
import { disableCanvasImageSmoothing } from '../../layout/gamePixelScale.js';
import { drawSpriteIntoEntityBounds } from './playerSpriteBoundsDraw.js';
import { resolveTrimmedPlayerSourceRect } from './playerSpriteSourceTrim.js';

/**
 * Compositor de camadas — base → gear (shirt/pants/shoes) → hair → acessórios.
 * Troca só o slot desejado sem sprites completos pré-combinados.
 */
export class PlayerLayerRenderer {
  private skin: PlayerSkin = createDefaultPlayerSkin();
  private accessoriesId: string | null = null;
  private currentGear = { id: createDefaultPlayerSkin().shirt };
  private layerImages = new Map<string, HTMLImageElement>();

  get currentSkin(): PlayerSkin {
    return this.skin;
  }

  get gearId(): string {
    return this.currentGear.id;
  }

  hasLayers(): boolean {
    return this.layerImages.size > 0;
  }

  setSkin(skin: PlayerSkin): void {
    this.skin = { ...skin };
    this.currentGear = { id: skin.shirt };
    void this.preload();
  }

  /** Gear = camada de roupa principal (mapeada para slot shirt). */
  setGear(gearId: string): void {
    this.currentGear = { id: gearId };
    this.skin = { ...this.skin, shirt: gearId };
    void this.preload();
  }

  setAccessories(accessoriesId: string | null): void {
    this.accessoriesId = accessoriesId;
    void this.preload();
  }

  async preload(): Promise<void> {
    this.layerImages.clear();
    const layers = buildOrderedLayerDescriptors(this.skin, this.accessoriesId);

    await Promise.all(layers.map(async (layer) => {
      const image = await PlayerSpriteLoader.loadLayer(layer.slot, layer.assetId);
      if (!image) return;
      this.layerImages.set(layerCacheKey(layer.slot, layer.assetId), image);
    }));
  }

  /**
   * Composição final no canvas:
   * 1. Base (pele/corpo)
   * 2. Gear (pants → shoes → shirt)
   * 3. Hair
   * 4. Acessórios techwear
   */
  renderPlayer(ctx: CanvasRenderingContext2D, rect: LayerDrawRect): void {
    const layers = buildOrderedLayerDescriptors(this.skin, this.accessoriesId);
    disableCanvasImageSmoothing(ctx);

    for (const layer of layers) {
      this.drawLayer(layer, ctx, rect);
    }
  }

  private drawLayer(
    layer: PlayerLayerDescriptor,
    ctx: CanvasRenderingContext2D,
    rect: LayerDrawRect,
  ): void {
    const image = this.layerImages.get(layerCacheKey(layer.slot, layer.assetId));
    if (!image?.complete || image.naturalWidth <= 0) return;

    const trimmed = resolveTrimmedPlayerSourceRect(image.naturalWidth, image.naturalHeight);
    drawSpriteIntoEntityBounds(
      ctx,
      image,
      trimmed,
      rect.feetX,
      rect.feetY,
      `player-layer-${layer.slot}`,
    );
  }
}
