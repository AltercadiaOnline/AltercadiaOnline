/**
 * Dicionário de aliases de props — drop-in replacement.
 *
 * Coloque `alias.png` em `/assets/props/props/` (ou `/assets/props/`) e o motor
 * troca automaticamente o placeholder procedural pelo PNG real, mantendo posição
 * e footprint intactos.
 */
export const PROP_ALIAS_PUBLIC_BASES = [
  '/assets/props/props',
  '/assets/props',
] as const;

export const PROP_ALIAS_REGISTRY: Readonly<Record<string, string>> = {
  street_light: 'street_light',
  poste_metal: 'street_light',
  trash_can: 'trash_can',
  lixeira: 'trash_can',
  mailbox: 'mailbox',
  correio: 'mailbox',
  fire_hydrant: 'fire_hydrant',
  hidrante: 'fire_hydrant',
  park_bench: 'park_bench',
  banco: 'park_bench',
  fire_extinguisher: 'fire_extinguisher',
  extintor: 'fire_extinguisher',
  graffiti_wall: 'graffiti_wall',
  grafite: 'graffiti_wall',
  tree: 'tree',
  arvore: 'tree',
  tree_default: 'tree',
  tree_willow: 'tree',
  tree_mega: 'tree',
  tree_luminous: 'tree',
  tree_curved: 'tree',
  tree_swirling: 'tree',
  tree_white: 'tree',
  tree_blue_green: 'tree',
  plant: 'plant',
  planta: 'plant',
  plant_default: 'plant',
  plant_bush_simple: 'plant',
  plant_bush_autumn: 'plant',
  plant_flower_blue: 'plant',
  plant_flower_pink: 'plant',
  plant_flower_red: 'plant',
  plant_flower_orange: 'plant',
  plant_cherry: 'plant',
  plant_fern: 'plant',
  plant_cactus: 'plant',
  bush: 'plant',
  flor: 'plant',
};

const cache = new Map<string, HTMLImageElement | null>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

export function resolvePropAliasFileName(assetKey: string): string {
  return PROP_ALIAS_REGISTRY[assetKey] ?? assetKey;
}

export function resolvePropAliasPublicUrls(assetKey: string): readonly string[] {
  const fileName = `${resolvePropAliasFileName(assetKey)}.png`;
  return PROP_ALIAS_PUBLIC_BASES.map((base) => `${base}/${fileName}`);
}

function cacheKey(assetKey: string): string {
  return resolvePropAliasFileName(assetKey);
}

export function preloadPropAliasImage(assetKey: string): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') {
    return Promise.resolve(null);
  }

  const key = cacheKey(assetKey);
  if (cache.has(key)) {
    return Promise.resolve(cache.get(key) ?? null);
  }

  const existing = pending.get(key);
  if (existing) return existing;

  const urls = resolvePropAliasPublicUrls(assetKey);

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    let index = 0;

    const tryNext = (): void => {
      const url = urls[index];
      if (!url) {
        cache.set(key, null);
        pending.delete(key);
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = () => {
        cache.set(key, img);
        pending.delete(key);
        resolve(img);
      };
      img.onerror = () => {
        index += 1;
        tryNext();
      };
      img.src = url;
    };

    tryNext();
  });

  pending.set(key, promise);
  return promise;
}

export function getCachedPropAliasImage(assetKey: string): HTMLImageElement | null {
  const key = cacheKey(assetKey);
  if (!cache.has(key)) {
    void preloadPropAliasImage(assetKey);
    return null;
  }
  return cache.get(key) ?? null;
}

export function propAliasTextureKey(assetKey: string): string {
  return `altercadia-prop-alias-${cacheKey(assetKey)}`;
}

export function listPropAliasKeys(): readonly string[] {
  return Object.keys(PROP_ALIAS_REGISTRY);
}

export function resetPropAliasImageCache(): void {
  cache.clear();
  pending.clear();
}
