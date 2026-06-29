import type { TiledTilesetDescriptor } from './tiledMapManifest.js';
import {
  readTiledObjectProperty as readSharedTiledObjectProperty,
  type TiledObjectPropertySource,
} from '../shared/world/tiledMapObject.js';

export type TiledJsonTileset = {
  readonly name: string;
  readonly image?: string;
};

export type TiledJsonObject = TiledObjectPropertySource & {
  readonly type?: string;
  readonly gid?: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly visible?: boolean;
  readonly rotation?: number;
};

export type TiledJsonLayer = {
  readonly name: string;
  readonly type: string;
  readonly visible?: boolean;
  readonly objects?: readonly TiledJsonObject[];
};

export type TiledMapJson = {
  readonly tilesets: readonly TiledJsonTileset[];
  readonly layers?: readonly TiledJsonLayer[];
};

/** Objeto Tiled pronto para o parser do Phaser (`Formats.TILED_JSON`). */
export type PhaserReadyTiledMap = Record<string, unknown>;

/**
 * O Phaser 4 IGNORA qualquer tileset que tenha o campo `source` (tileset externo .tsx)
 * — ver node_modules/phaser/src/tilemaps/parsers/tiled/ParseTilesets.js. O espelho
 * (`src/config/maps/*.json`) é enriquecido com `image`/`name`, mas mantém `source`,
 * então precisamos removê-lo para o Phaser embutir o tileset e renderizar os tiles.
 */
export function buildPhaserTiledMapData(json: TiledMapJson): PhaserReadyTiledMap {
  const source = json as unknown as Record<string, unknown>;
  const clone: Record<string, unknown> = { ...source };
  const tilesets = Array.isArray(source.tilesets) ? source.tilesets : [];

  clone.tilesets = tilesets.map((entry) => {
    const tileset = { ...(entry as Record<string, unknown>) };
    delete tileset.source;
    return tileset;
  });

  return clone;
}

/** Tilesets declarados no export Tiled — fonte única para preload (sem lista manual). */
export function extractTilesetsFromTiledJson(json: TiledMapJson): TiledTilesetDescriptor[] {
  const seen = new Set<string>();

  return json.tilesets
    .filter((tileset) => typeof tileset.image === 'string' && tileset.image.length > 0)
    .filter((tileset) => {
      if (seen.has(tileset.name)) return false;
      seen.add(tileset.name);
      return true;
    })
    .map((tileset) => ({
      name: tileset.name,
      imagePath: tileset.image!,
    }));
}

export function listTiledObjectGroupLayers(json: TiledMapJson): readonly TiledJsonLayer[] {
  return (json.layers ?? []).filter((layer) => layer.type === 'objectgroup');
}

export function readTiledObjectProperty(
  object: TiledObjectPropertySource,
  propertyName: string,
): string | number | boolean | undefined {
  return readSharedTiledObjectProperty(object, propertyName);
}

/** PNGs soltos referenciados por propriedade `image` em object layers (structures/props). */
export function extractObjectImagePathsFromTiledJson(json: TiledMapJson): string[] {
  const paths = new Set<string>();

  for (const layer of listTiledObjectGroupLayers(json)) {
    for (const object of layer.objects ?? []) {
      const imageProperty = readTiledObjectProperty(object, 'image');
      if (typeof imageProperty === 'string' && imageProperty.trim().length > 0) {
        paths.add(imageProperty.trim());
        continue;
      }

      if (typeof object.type === 'string') {
        const typeValue = object.type.trim();
        if (typeValue.includes('/') || typeValue.endsWith('.png')) {
          paths.add(typeValue);
        }
      }
    }
  }

  return [...paths];
}
