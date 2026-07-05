import type { TiledJsonObject } from '../../../config/tiledMapJson.js';
import type { TiledPlayerSpawn } from '../../../shared/world/tiledMapSpawn.js';
import type { MapId } from '../../../shared/world/mapRegistry.js';

export type PhaserStaticBody = {
  setSize: (width: number, height: number, center?: boolean) => void;
  setOffset: (x: number, y: number) => void;
};

export type PhaserMapSprite = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly body?: PhaserStaticBody;
  readonly texture: {
    get: (key: string) => { readonly width: number; readonly height: number } | null;
  };
  setDepth: (depth: number) => PhaserMapSprite;
  setOrigin: (x: number, y: number) => PhaserMapSprite;
  setDisplaySize: (width: number, height: number) => PhaserMapSprite;
  setData: (key: string, value: unknown) => PhaserMapSprite;
  destroy: () => void;
};

/** @deprecated Alias legado — prefira PhaserMapSprite. */
export type PhaserTiledSprite = PhaserMapSprite;

export type PhaserTiledTileset = {
  readonly name: string;
  readonly firstgid: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly margin?: number;
  readonly spacing?: number;
  readonly image?: string;
};

export type PhaserTiledLayer = {
  readonly name: string;
  readonly type: string;
};

export type PhaserTiledTilemapLayer = {
  setDepth: (depth: number) => PhaserTiledTilemapLayer;
  setVisible: (visible: boolean) => PhaserTiledTilemapLayer;
  setCollisionByProperty: (properties: Record<string, unknown>, options?: Record<string, unknown>) => void;
  setCollisionByExclusion: (excluded: readonly number[], recalculateFaces?: boolean, updateLayer?: PhaserTiledTilemapLayer) => void;
  destroy: () => void;
};

export type PhaserTiledObjectLayer = {
  readonly name: string;
  readonly type?: string;
  readonly objects?: readonly TiledJsonObject[];
};

export type PhaserTiledTilemap = {
  readonly width: number;
  readonly height: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly widthInPixels: number;
  readonly heightInPixels: number;
  readonly tilesets: readonly PhaserTiledTileset[];
  /** Somente tile layers — no Phaser não têm campo `type` (diferente do JSON Tiled cru). */
  readonly layers: readonly PhaserTiledLayer[];
  /** Object layers parseadas pelo Phaser (`objectgroup`). */
  readonly objects?: readonly PhaserTiledObjectLayer[];
  addTilesetImage: (
    tilesetName: string,
    textureKey: string,
    tileWidth?: number,
    tileHeight?: number,
    tileMargin?: number,
    tileSpacing?: number,
  ) => PhaserTiledTileset | null;
  createLayer: (
    layerName: string,
    tilesets: readonly PhaserTiledTileset[],
    x?: number,
    y?: number,
  ) => PhaserTiledTilemapLayer | null;
  createFromObjects: (
    layerName: string,
    config?: Record<string, unknown> | readonly Record<string, unknown>[],
    useTileset?: boolean,
  ) => readonly PhaserMapSprite[];
  setCollisionByProperty: (properties: Record<string, unknown>, options?: Record<string, unknown>) => void;
  destroy: () => void;
};

export type TiledMapObjectRecord = {
  readonly uid: string;
  readonly layerName: string;
  readonly mapId: MapId;
  readonly collidable: boolean;
  readonly sprite: PhaserMapSprite;
  readonly objectId?: number;
  readonly name?: string;
};

export type MapLoaderMountResult = {
  readonly mapId: MapId;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly objects: readonly TiledMapObjectRecord[];
  readonly objectByUid: ReadonlyMap<string, TiledMapObjectRecord>;
  readonly playerSpawn: TiledPlayerSpawn | null;
};

/** @deprecated Use MapLoaderMountResult */
export type TiledMapMountResult = Pick<MapLoaderMountResult, 'mapId' | 'widthPx' | 'heightPx'>;

export type MapLoaderScene = {
  readonly textures: {
    exists: (key: string) => boolean;
  };
  readonly load: {
    tilemapTiledJSON: (key: string, url: string) => void;
    image: (key: string, url: string) => void;
  };
  readonly make: {
    tilemap: (config: { key: string }) => PhaserTiledTilemap;
  };
  readonly cache: {
    tilemap: {
      has: (key: string) => boolean;
      add: (key: string, entry: { format: number; data: unknown }) => void;
      /** O cache de tilemap do Phaser guarda `{ format, data }` (ver ParseToTilemap.js). */
      get: (key: string) => {
        readonly format: number;
        readonly data: {
          readonly layers: readonly {
            readonly name: string;
            readonly objects?: readonly {
              readonly id?: number;
              readonly name?: string;
              readonly type?: string;
              readonly gid?: number;
              readonly x: number;
              readonly y: number;
              readonly width: number;
              readonly height: number;
              readonly properties?: readonly {
                readonly name: string;
                readonly value: string | number | boolean;
              }[];
            }[];
          }[];
        };
      } | null;
    };
  };
  readonly add: {
    container: (x: number, y: number) => {
      add: (child: unknown) => unknown;
      setDepth: (depth: number) => unknown;
      destroy: () => void;
    };
    sprite: (x: number, y: number, textureKey: string) => PhaserMapSprite;
  };
  readonly physics?: {
    add: {
      existing: (
        target: PhaserMapSprite | PhaserTiledTilemapLayer,
        isStatic: boolean,
      ) => PhaserMapSprite | PhaserTiledTilemapLayer;
    };
  };
};

/** @deprecated Use MapLoaderScene */
export type PhaserTiledScene = MapLoaderScene;
