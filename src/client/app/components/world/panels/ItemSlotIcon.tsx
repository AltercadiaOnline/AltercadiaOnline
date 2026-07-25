// @ts-nocheck
import { useEffect, useState } from 'react';
import { getItemById } from '../../../../../shared/items/itemCatalog.js';
import { resolveItemIconSrc, UNKNOWN_ITEM_ICON_PATH, } from '../../../../ui/items/itemIconDisplay.js';
/**
 * Sprite do item — convenção `/assets/items/{itemId}.png` (ou iconPath do catálogo).
 * Fallback visual: unknown.svg se o arquivo não existir.
 */
export function ItemSlotIcon({ itemId, className = 'slot-item__sprite', }) {
    const [src, setSrc] = useState(() => resolveItemIconSrc(itemId));
    const isCatalogMiss = !getItemById(itemId);
    useEffect(() => {
        setSrc(resolveItemIconSrc(itemId));
    }, [itemId]);
    return (<img className={`${className}${isCatalogMiss ? ' item-icon--unknown' : ''}`} src={src} alt="" width={32} height={32} loading="lazy" decoding="async" data-item-icon="true" data-item-id={itemId} aria-hidden="true" onError={() => {
            setSrc(UNKNOWN_ITEM_ICON_PATH);
        }}/>);
}
