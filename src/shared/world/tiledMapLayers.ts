/** Convenção de nomes de camadas Tiled — normalizar com lowercase + trim. */
export function normalizeTiledLayerName(layerName: string): string {
  return layerName.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Tile layer invisível — colisão de tiles (`collides: true` no tileset). */
export function isTiledCollisionTileLayer(layerName: string): boolean {
  const normalized = normalizeTiledLayerName(layerName);
  return normalized === 'collision' || normalized === 'collisionlayer';
}

/** Tile layers visuais — chão e decoração (qualquer tile layer exceto colisão). */
export function isTiledVisualTileLayer(layerName: string): boolean {
  return !isTiledCollisionTileLayer(layerName);
}

/** Object layer — estruturas estáticas (/structures). */
export function isTiledStructureObjectLayer(layerName: string): boolean {
  return normalizeTiledLayerName(layerName) === 'structures';
}

/** Object layer — props decorativos (/props). */
export function isTiledPropObjectLayer(layerName: string): boolean {
  return normalizeTiledLayerName(layerName) === 'props';
}

/** Object layer — spawns (sem sprite; só metadados). */
export function isTiledSpawnObjectLayer(layerName: string): boolean {
  return normalizeTiledLayerName(layerName) === 'spawns';
}

/** Object layer reservada a metadados de colisão (sem sprites). */
export function isTiledCollisionObjectLayer(layerName: string): boolean {
  const normalized = normalizeTiledLayerName(layerName);
  return normalized === 'collision'
    || normalized === 'collisionlayer'
    || normalized === 'collisions'
    || normalized === 'colisao'
    || normalized === 'colisoes';
}

/**
 * Object layers instanciadas como sprites pelo MapLoader.
 * Aceita nomes livres do Tiled (ex.: objetos1-128x128, pulpito) — não só structures/props.
 */
export function isTiledRenderableObjectLayer(layerName: string): boolean {
  if (isTiledSpawnObjectLayer(layerName)) return false;
  if (isTiledCollisionObjectLayer(layerName)) return false;
  return true;
}
