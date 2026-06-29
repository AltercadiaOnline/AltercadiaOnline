import {
  hasNpcAssetBundle,
  listNpcAssetBundleIds,
} from '../../assets/npcs/npcDefinition.js';
import { NpcSpriteLoader } from './NpcSpriteLoader.js';

const cache = new Map<string, HTMLImageElement | null>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

export function getCachedNpcAssetImage(npcId: string): HTMLImageElement | null {
  const south = NpcSpriteLoader.getCachedRotation(npcId, 'south');
  if (south?.image.complete && south.image.naturalWidth > 0) {
    return south.image;
  }

  if (!cache.has(npcId) && hasNpcAssetBundle(npcId)) {
    void preloadNpcAssetImage(npcId);
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

  if (!hasNpcAssetBundle(npcId)) {
    cache.set(npcId, null);
    return Promise.resolve(null);
  }

  const promise = NpcSpriteLoader.loadCatalog(npcId).then((catalog) => {
    const south = catalog?.rotations.south;
    const image = south?.image ?? null;
    cache.set(npcId, image);
    pending.delete(npcId);
    return image;
  });

  pending.set(npcId, promise);
  return promise;
}

export function preloadAllNpcDefinitionAssets(): Promise<void> {
  return Promise.all(listNpcAssetBundleIds().map((id) => preloadNpcAssetImage(id))).then(() => undefined);
}
