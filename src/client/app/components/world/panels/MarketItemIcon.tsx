import { useState } from 'react';
import { getItemById } from '../../../../../shared/items/itemCatalog.js';
import {
  resolveItemIconSrc,
  UNKNOWN_ITEM_ICON_PATH,
} from '../../../../ui/items/itemIconDisplay.js';

type MarketItemIconProps = {
  readonly itemId: string;
  readonly className?: string;
};

export function MarketItemIcon({
  itemId,
  className = 'market-terminal__item-icon',
}: MarketItemIconProps) {
  const [src, setSrc] = useState(() => resolveItemIconSrc(itemId));
  const isCatalogMiss = !getItemById(itemId);

  return (
    <img
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
      onError={() => setSrc(UNKNOWN_ITEM_ICON_PATH)}
    />
  );
}
