import {

  get,

  getRegistryAsset,

  resolveAssetId,

  TILESET_ATLAS_URL,

  type AssetFrame,

} from './AssetRegistry.js';

import {

  applyCanvasAssetWarningTint,

  planCanvasAssetDraw,

} from './assets/assetNormalizer.js';

import {

  getCachedRegistryFileImage,

  preloadRegistryFileAsset,

} from './registryFileImageLoader.js';



const atlasCache = new Map<string, HTMLImageElement | null>();

const atlasPending = new Map<string, Promise<HTMLImageElement | null>>();



export const PHASER_TILESET_ATLAS_TEXTURE_KEY = 'altercadia-tileset-atlas';



export function getTilesetAtlasUrl(): string {

  return TILESET_ATLAS_URL;

}



export function preloadTilesetAtlas(): Promise<HTMLImageElement | null> {

  if (typeof Image === 'undefined') {

    return Promise.resolve(null);

  }



  const url = TILESET_ATLAS_URL;

  const cached = atlasCache.get(url);

  if (cached) return Promise.resolve(cached);

  if (atlasCache.has(url)) return Promise.resolve(null);



  const existing = atlasPending.get(url);

  if (existing) return existing;



  const promise = new Promise<HTMLImageElement | null>((resolve) => {

    const img = new Image();

    img.onload = () => {

      atlasCache.set(url, img);

      atlasPending.delete(url);

      resolve(img);

    };

    img.onerror = () => {

      atlasCache.set(url, null);

      atlasPending.delete(url);

      resolve(null);

    };

    img.src = url;

  });



  atlasPending.set(url, promise);

  return promise;

}



export function getCachedTilesetAtlas(): HTMLImageElement | null {

  const url = TILESET_ATLAS_URL;

  if (!atlasCache.has(url)) {

    void preloadTilesetAtlas();

    return null;

  }

  return atlasCache.get(url) ?? null;

}



export function resolveRegistryFrame(assetKey: string): AssetFrame | null {

  return get(assetKey);

}



export function hasRegistryAsset(assetKey: string): boolean {

  return resolveAssetId(assetKey) !== null;

}



/** Desenha recorte do atlas no canvas — escala forçada via Asset Normalizer. */

export function drawRegistryAssetAtFeet(

  ctx: CanvasRenderingContext2D,

  assetKey: string,

  feetX: number,

  feetY: number,

  displayW?: number,

  displayH?: number,

): boolean {

  const asset = getRegistryAsset(assetKey);

  if (asset?.source === 'file') {

    const image = getCachedRegistryFileImage(assetKey);

    if (!image?.complete || image.naturalWidth <= 0) {

      void preloadRegistryFileAsset(assetKey);

      return false;

    }



    const targetW = displayW ?? asset.width;

    const targetH = displayH ?? asset.height;

    const plan = planCanvasAssetDraw(

      image.naturalWidth,

      image.naturalHeight,

      targetW,

      targetH,

      asset.fileName,

    );



    const originX = asset.originX;

    const originY = asset.originY;

    const dx = Math.floor(feetX - plan.targetWidth * originX);

    const dy = Math.floor(feetY - plan.targetHeight * originY);



    ctx.drawImage(

      image,

      0,

      0,

      image.naturalWidth,

      image.naturalHeight,

      dx,

      dy,

      plan.targetWidth,

      plan.targetHeight,

    );



    if (plan.proportionMismatch) {

      applyCanvasAssetWarningTint(ctx, dx, dy, plan.targetWidth, plan.targetHeight);

    }



    return true;

  }



  const frame = get(assetKey);

  const atlas = getCachedTilesetAtlas();

  if (!frame || !atlas?.complete || atlas.naturalWidth <= 0) {

    return false;

  }



  const targetW = displayW ?? frame.width;

  const targetH = displayH ?? frame.height;

  const plan = planCanvasAssetDraw(

    frame.width,

    frame.height,

    targetW,

    targetH,

    assetKey,

  );



  const originX = frame.originX ?? 0.5;

  const originY = frame.originY ?? 1;

  const dx = Math.floor(feetX - plan.targetWidth * originX);

  const dy = Math.floor(feetY - plan.targetHeight * originY);



  ctx.drawImage(

    atlas,

    frame.x,

    frame.y,

    frame.width,

    frame.height,

    dx,

    dy,

    plan.targetWidth,

    plan.targetHeight,

  );



  if (plan.proportionMismatch) {

    applyCanvasAssetWarningTint(ctx, dx, dy, plan.targetWidth, plan.targetHeight);

  }



  return true;

}



/** Tile de chão — canto superior esquerdo, escala forçada. */

export function drawRegistryTile(

  ctx: CanvasRenderingContext2D,

  assetKey: string,

  worldX: number,

  worldY: number,

  size: number,

): boolean {

  const asset = getRegistryAsset(assetKey);

  if (asset?.source === 'file') {

    const image = getCachedRegistryFileImage(assetKey);

    if (!image?.complete || image.naturalWidth <= 0) {

      void preloadRegistryFileAsset(assetKey);

      return false;

    }



    const plan = planCanvasAssetDraw(

      image.naturalWidth,

      image.naturalHeight,

      size,

      size,

      asset.fileName,

    );

    const dx = Math.floor(worldX);

    const dy = Math.floor(worldY);



    ctx.drawImage(

      image,

      0,

      0,

      image.naturalWidth,

      image.naturalHeight,

      dx,

      dy,

      plan.targetWidth,

      plan.targetHeight,

    );



    if (plan.proportionMismatch) {

      applyCanvasAssetWarningTint(ctx, dx, dy, plan.targetWidth, plan.targetHeight);

    }



    return true;

  }



  const frame = get(assetKey);

  const atlas = getCachedTilesetAtlas();

  if (!frame || !atlas?.complete || atlas.naturalWidth <= 0) {

    return false;

  }



  const plan = planCanvasAssetDraw(frame.width, frame.height, size, size, assetKey);

  const dx = Math.floor(worldX);

  const dy = Math.floor(worldY);



  ctx.drawImage(

    atlas,

    frame.x,

    frame.y,

    frame.width,

    frame.height,

    dx,

    dy,

    plan.targetWidth,

    plan.targetHeight,

  );



  if (plan.proportionMismatch) {

    applyCanvasAssetWarningTint(ctx, dx, dy, plan.targetWidth, plan.targetHeight);

  }



  return true;

}



export function resetTilesetAtlasCache(): void {

  atlasCache.clear();

  atlasPending.clear();

}


