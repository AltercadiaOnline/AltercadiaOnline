import { getRegistryAsset } from './AssetRegistry.js';

const cache = new Map<string, HTMLImageElement | null>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

function resolveFileAsset(assetKey: string) {
  const asset = getRegistryAsset(assetKey);
  if (!asset || asset.source !== 'file' || !asset.url) {
    return null;
  }
  return asset;
}

export function preloadRegistryFileAsset(assetKey: string): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') {
    return Promise.resolve(null);
  }

  const asset = resolveFileAsset(assetKey);
  if (!asset) {
    return Promise.resolve(null);
  }

  const existing = pending.get(asset.id);
  if (existing) {
    return existing;
  }

  const cached = cache.get(asset.id);
  if (cached) {
    return Promise.resolve(cached);
  }

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(asset.id, img);
      pending.delete(asset.id);
      resolve(img);
    };
    img.onerror = () => {
      cache.set(asset.id, null);
      pending.delete(asset.id);
      resolve(null);
    };
    img.src = asset.url!;
  });

  pending.set(asset.id, promise);
  return promise;
}

export function getCachedRegistryFileImage(assetKey: string): HTMLImageElement | null {
  const asset = resolveFileAsset(assetKey);
  if (!asset) {
    return null;
  }

  if (!cache.has(asset.id)) {
    void preloadRegistryFileAsset(assetKey);
    return null;
  }

  return cache.get(asset.id) ?? null;
}

export function resetRegistryFileImageCache(): void {
  cache.clear();
  pending.clear();
}
