import type { PetRenderSnapshot } from '../../entities/pet/PetFollowEntity.js';
import { renderPetSprite } from '../../entities/pet/petRenderer.js';
import { getPetFeetWorldY, getPetVisualBounds } from '../../../shared/world/petEntity.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';
import type { PhaserLayoutContainer } from '../layout/phaserLayoutScene.js';
import { resolvePhaserWorldDepth } from '../layout/phaserWorldDepth.js';

const PET_TEXTURE_KEY = 'altercadia-pet-follow';

type PhaserPetImage = {
  setPosition: (x: number, y: number) => PhaserPetImage;
  setOrigin: (x: number, y: number) => PhaserPetImage;
  setDepth: (depth: number) => PhaserPetImage;
  setDisplaySize: (width: number, height: number) => PhaserPetImage;
  setVisible: (visible: boolean) => PhaserPetImage;
  destroy: () => void;
};

type PhaserPetScene = {
  textures: {
    exists: (key: string) => boolean;
    addImage: (key: string, source: HTMLImageElement) => unknown;
    remove: (key: string) => void;
    get: (key: string) => { setFilter: (mode: number) => void };
  };
  add: {
    image: (x: number, y: number, textureKey: string) => PhaserPetImage;
  };
};

/**
 * Pet top-down no Phaser — canvas procedural espelhando `renderPetSprite`.
 */
export class PhaserPetController {
  private sprite: PhaserPetImage | null = null;

  private scene: PhaserPetScene | null = null;

  private ySortContainer: PhaserLayoutContainer | null = null;

  private canvas: HTMLCanvasElement | null = null;

  private lastDrawKey = '';

  mount(scene: PhaserPetScene, ySortContainer?: PhaserLayoutContainer | null): void {
    this.scene = scene;
    this.ySortContainer = ySortContainer ?? null;
  }

  sync(snapshot: PetRenderSnapshot | null, timestampMs: number): void {
    const scene = this.scene;
    if (!scene || !snapshot?.visible) {
      this.sprite?.setVisible(false);
      return;
    }

    const bounds = getPetVisualBounds(snapshot);
    const feetX = Math.floor(snapshot.x);
    const feetY = Math.floor(getPetFeetWorldY(snapshot));
    const drawKey = `${snapshot.kindId}:${snapshot.colorId}:${snapshot.gender}:${Math.floor(snapshot.animPhase * 4)}:${Math.floor(timestampMs / 32)}`;

    void this.ensureTexture(scene, snapshot, bounds, timestampMs, drawKey).then((ready) => {
      if (!ready) {
        this.sprite?.setVisible(false);
        return;
      }

      if (!this.sprite) {
        this.sprite = scene.add.image(feetX, feetY, PET_TEXTURE_KEY);
        this.sprite.setOrigin(0.5, 1);
        this.ySortContainer?.add(this.sprite);
      }

      this.sprite.setPosition(feetX, feetY);
      this.sprite.setDisplaySize(bounds.width, bounds.height);
      this.sprite.setDepth(resolvePhaserWorldDepth(feetY));
      this.sprite.setVisible(true);
    });
  }

  destroy(): void {
    this.sprite?.destroy();
    this.sprite = null;
    this.canvas = null;
    this.lastDrawKey = '';
    this.scene = null;
    this.ySortContainer = null;
  }

  private async ensureTexture(
    scene: PhaserPetScene,
    snapshot: PetRenderSnapshot,
    bounds: ReturnType<typeof getPetVisualBounds>,
    timestampMs: number,
    drawKey: string,
  ): Promise<boolean> {
    if (typeof document === 'undefined') {
      return false;
    }

    if (drawKey === this.lastDrawKey && scene.textures.exists(PET_TEXTURE_KEY)) {
      return true;
    }

    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }

    const canvas = this.canvas;
    canvas.width = Math.max(1, Math.round(bounds.width));
    canvas.height = Math.max(1, Math.round(bounds.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return false;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-bounds.x, -bounds.y);
    renderPetSprite(ctx, snapshot, timestampMs);
    ctx.restore();

    const img = await canvasToImage(canvas);
    if (scene.textures.exists(PET_TEXTURE_KEY)) {
      scene.textures.remove(PET_TEXTURE_KEY);
    }
    scene.textures.addImage(PET_TEXTURE_KEY, img);
    try {
      scene.textures.get(PET_TEXTURE_KEY).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
    } catch {
      /* noop */
    }

    this.lastDrawKey = drawKey;
    return true;
  }
}

function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = canvas.toDataURL('image/png');
  });
}
