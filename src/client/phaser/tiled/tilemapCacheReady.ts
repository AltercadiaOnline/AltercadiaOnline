/** Phaser 3/4 — cache de tilemap usa `has()`; alguns wrappers legados usam `exists()`. */
export function isTilemapCacheReady(
  cache: {
    has?: (key: string) => boolean;
    exists?: (key: string) => boolean;
  },
  key: string,
): boolean {
  if (typeof cache.has === 'function') {
    return cache.has(key);
  }
  if (typeof cache.exists === 'function') {
    return cache.exists(key);
  }
  return false;
}
