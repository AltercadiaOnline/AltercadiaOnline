/** Formato JSONArray do Texture Packer — compatível com Phaser 3/4 `load.atlas`. */

export type PhaserAtlasFrameRect = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

export type PhaserAtlasFrameEntry = {
  readonly frame: PhaserAtlasFrameRect;
  readonly rotated: boolean;
  readonly trimmed: boolean;
  readonly spriteSourceSize: PhaserAtlasFrameRect;
  readonly sourceSize: PhaserAtlasFrameRect;
};

export type PhaserAtlasJson = {
  readonly frames: Record<string, PhaserAtlasFrameEntry>;
  readonly meta: {
    readonly app: string;
    readonly version: string;
    readonly image: string;
    readonly format: 'RGBA8888';
    readonly size: { readonly w: number; readonly h: number };
    readonly scale: '1';
  };
};

export function buildPhaserAtlasJson(
  imageFileName: string,
  atlasWidth: number,
  atlasHeight: number,
  frames: ReadonlyArray<{
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly sourceWidth?: number;
    readonly sourceHeight?: number;
    readonly trimmed?: boolean;
  }>,
): PhaserAtlasJson {
  const out: Record<string, PhaserAtlasFrameEntry> = {};

  for (const frame of frames) {
    const sourceW = frame.sourceWidth ?? frame.width;
    const sourceH = frame.sourceHeight ?? frame.height;
    const trimmed = frame.trimmed ?? false;

    out[frame.name] = {
      frame: { x: frame.x, y: frame.y, w: frame.width, h: frame.height },
      rotated: false,
      trimmed,
      spriteSourceSize: { x: 0, y: 0, w: sourceW, h: sourceH },
      sourceSize: { w: sourceW, h: sourceH },
    };
  }

  return {
    frames: out,
    meta: {
      app: 'altercadia-generateAtlas',
      version: '1.0',
      image: imageFileName,
      format: 'RGBA8888',
      size: { w: atlasWidth, h: atlasHeight },
      scale: '1',
    },
  };
}
