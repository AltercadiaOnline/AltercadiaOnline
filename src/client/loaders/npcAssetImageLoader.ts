import {
  listNpcDefinitionIds,
  resolveNpcSpriteImageUrl,
} from '../../assets/npcs/npcDefinition.js';

const cache = new Map<string, HTMLImageElement | null>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

export function getCachedNpcAssetImage(npcId: string): HTMLImageElement | null {
  if (!cache.has(npcId)) {
    const url = resolveNpcSpriteImageUrl(npcId);
    if (url) void preloadNpcAssetImage(npcId);
    return null;
  }
  return cache.get(npcId) ?? null;
}

export function preloadNpcAssetImage(npcId: string): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') {
    return Promise.resolve(null);
  }

  const cached = cache.get(npcId);
  if (cached) return Promise.resolve(cached);

  const inflight = pending.get(npcId);
  if (inflight) return inflight;

  const url = resolveNpcSpriteImageUrl(npcId);
  if (!url) {
    cache.set(npcId, null);
    return Promise.resolve(null);
  }

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      cache.set(npcId, image);
      pending.delete(npcId);
      resolve(image);
    };
    image.onerror = () => {
      cache.set(npcId, null);
      pending.delete(npcId);
      resolve(null);
    };
    image.src = url;
  });

  pending.set(npcId, promise);
  return promise;
}

export function preloadAllNpcDefinitionAssets(): Promise<void> {
  return Promise.all(listNpcDefinitionIds().map((id) => preloadNpcAssetImage(id))).then(() => undefined);
}
