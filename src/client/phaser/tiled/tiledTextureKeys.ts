/** Chave compartilhada por URL de imagem — evita carregar o mesmo PNG duas vezes (ex.: terrain_atlas.png). */
export function tiledSharedTilesetTextureKey(mapCacheKey: string, publicImageUrl: string): string {
  const normalized = publicImageUrl.replace(/\\/g, '/').replace(/^\/+/, '');
  const slug = normalized.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `${mapCacheKey}:img:${slug}`;
}

export function tiledTilesetLookupKey(mapCacheKey: string, tilesetName: string): string {
  return `${mapCacheKey}:tslookup:${tilesetName.trim().toLowerCase()}`;
}
