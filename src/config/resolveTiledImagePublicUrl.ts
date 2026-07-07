/**
 * Resolve `../terrain/...` (export Tiled) → URL pública em `/assets/...`.
 * Usado por preload, mirror Phaser e auditoria de mapas.
 */
export function resolveTiledImagePublicUrl(
  mapJsonUrl: string,
  tiledImagePath: string,
): string {
  const normalized = tiledImagePath.replace(/\\/g, '/');
  if (normalized.startsWith('/assets/')) {
    return normalized;
  }

  const mapBase = mapJsonUrl.replace(/\/[^/]+$/, '');
  const combined = `${mapBase}/${normalized}`;
  const segments = combined.split('/').filter((segment) => segment.length > 0);
  const resolved: string[] = [];

  for (const segment of segments) {
    if (segment === '.') continue;
    if (segment === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  return `/${resolved.join('/')}`;
}
