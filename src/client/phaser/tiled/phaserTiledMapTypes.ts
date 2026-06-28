import type { TiledPlayerSpawn } from '../../../shared/world/tiledMapSpawn.js';
import type { MapId } from '../../../shared/world/mapRegistry.js';

export type PhaserStaticBody = {
  setSize: (width: number, height: number, center?: boolean) => void;
  setOffset: (x: number, y: number) => void;
};

export type PhaserMapSprite = {
  readonly x: number;
  readonly y: number;
  readonly body?: PhaserStaticBody;
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

export type PhaserTiledTilemap = {
  readonly width: number;
  readonly height: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly widthInPixels: number;
  readonly heightInPixels: number;
  readonly tilesets: readonly PhaserTiledTileset[];
  readonly layers: readonly PhaserTiledLayer[];
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
    tilesets: readonly PhaserTiledTileset[],
    x?: number,
    y?: number,
    recursive?: boolean,
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
      get: (key: string) => {
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
