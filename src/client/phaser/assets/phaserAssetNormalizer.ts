// @ts-nocheck
import { ASSET_WARNING_TINT_COLOR, normalizeAsset, } from '../../../game/assets/assetNormalizer.js';
export function normalizePhaserAsset(sprite, sourceWidth, sourceHeight, targetWidth, targetHeight, fileName) {
    return normalizeAsset({
        sourceWidth,
        sourceHeight,
        fileName,
        setDisplaySize: (width, height) => {
            sprite.setDisplaySize(width, height);
        },
        setWarningTint: (active) => {
            if (active) {
                sprite.setTint?.(ASSET_WARNING_TINT_COLOR);
                return;
            }
            sprite.clearTint?.();
        },
    }, targetWidth, targetHeight);
}
