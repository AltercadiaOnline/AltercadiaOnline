import {
  ASSET_WARNING_TINT_COLOR,
  normalizeAsset,
  type AssetScaleEvaluation,
} from '../../../game/assets/assetNormalizer.js';
export type NormalizablePhaserImage = {
  setDisplaySize: (width: number, height: number) => void;
  setTint?: (color: number) => void;
  clearTint?: () => void;
};

export function normalizePhaserAsset(
  sprite: NormalizablePhaserImage,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fileName: string,
): AssetScaleEvaluation {
  return normalizeAsset(
    {
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
    },
    targetWidth,
    targetHeight,
  );
}
