import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getItemById } from '../../../../../shared/items/itemCatalog.js';
import {
  resolveItemIconSrc,
  UNKNOWN_ITEM_ICON_PATH,
} from '../../../../ui/items/itemIconDisplay.js';
import { resolveOpaqueCenterTransform } from '../../../../ui/items/itemIconOpaqueCenter.js';

type ItemSlotIconProps = {
  readonly itemId: string;
  readonly className?: string;
  /** Centraliza a arte opaca no slot (SET da sidebar). Não muda escala. */
  readonly centerOpaqueContent?: boolean;
};

/**
 * Sprite do item — convenção `/assets/items/{itemId}.png` (ou iconPath do catálogo).
 * Fallback visual: unknown.svg se o arquivo não existir.
 */
export function ItemSlotIcon({
  itemId,
  className = 'slot-item__sprite',
  centerOpaqueContent = false,
}: ItemSlotIconProps) {
  const [src, setSrc] = useState(() => resolveItemIconSrc(itemId));
  const isCatalogMiss = !getItemById(itemId);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setSrc(resolveItemIconSrc(itemId));
  }, [itemId]);

  const applyOpaqueCenter = useCallback(() => {
    const image = imageRef.current;
    if (!image) return;
    if (!centerOpaqueContent) {
      image.style.transform = '';
      return;
    }
    const offset = resolveOpaqueCenterTransform(image);
    image.style.transform = offset ? `translate(${offset.x}px, ${offset.y}px)` : '';
  }, [centerOpaqueContent]);

  useLayoutEffect(() => {
    applyOpaqueCenter();
  }, [applyOpaqueCenter, src, itemId]);

  return (
    <img
      ref={imageRef}
      className={`${className}${isCatalogMiss ? ' item-icon--unknown' : ''}`}
      src={src}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
      data-item-icon="true"
      data-item-id={itemId}
      aria-hidden="true"
      onLoad={applyOpaqueCenter}
      onError={() => {
        setSrc(UNKNOWN_ITEM_ICON_PATH);
      }}
    />
  );
}
