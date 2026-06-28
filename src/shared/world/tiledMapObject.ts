export type TiledObjectProperty = {
  readonly name: string;
  readonly type?: string;
  readonly value: string | number | boolean;
};

export type TiledObjectPropertySource = {
  readonly id?: number;
  readonly name?: string;
  readonly properties?: readonly TiledObjectProperty[];
};

export function readTiledObjectProperty(
  object: TiledObjectPropertySource,
  propertyName: string,
): string | number | boolean | undefined {
  const entry = object.properties?.find((property) => property.name === propertyName);
  return entry?.value;
}

/**
 * UID estável para sync servidor — prioriza propriedade `uid` do Tiled.
 * Formato canônico: `{mapId}:{uid|layer:id}`.
 */
export function resolveTiledMapObjectUid(
  mapId: string,
  layerName: string,
  object: TiledObjectPropertySource,
): string {
  const customUid = readTiledObjectProperty(object, 'uid');
  if (typeof customUid === 'string' && customUid.trim().length > 0) {
    return `${mapId}:${customUid.trim()}`;
  }
  if (typeof customUid === 'number' && Number.isFinite(customUid)) {
    return `${mapId}:${customUid}`;
  }
  if (object.id !== undefined) {
    return `${mapId}:${layerName}:${object.id}`;
  }
  const fallbackName = object.name?.trim() || 'object';
  return `${mapId}:${layerName}:${fallbackName}`;
}

/** Colisão de props/estruturas — propriedade Tiled `collidable: true`. */
export function isTiledMapObjectCollidable(object: TiledObjectPropertySource): boolean {
  const value = readTiledObjectProperty(object, 'collidable');
  return value === true || value === 'true' || value === 1;
}
