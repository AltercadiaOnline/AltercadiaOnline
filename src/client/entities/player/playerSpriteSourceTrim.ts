/**
 * Recorte de padding transparente em assets de pixel art.
 * Remove margem vazia para ocupação visual = tamanho do draw 1:1.
 */
export const PLAYER_SPRITE_SRC_TOP_TRIM = 0.06;
export const PLAYER_SPRITE_SRC_BOTTOM_TRIM = 0.18;
export const PLAYER_SPRITE_SRC_SIDE_TRIM = 0.04;

export type TrimmedSourceRect = {
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
};

export type AssetTrimRatios = {
  readonly top?: number;
  readonly bottom?: number;
  readonly left?: number;
  readonly right?: number;
};

const DEFAULT_TRIM: Required<AssetTrimRatios> = {
  top: PLAYER_SPRITE_SRC_TOP_TRIM,
  bottom: PLAYER_SPRITE_SRC_BOTTOM_TRIM,
  left: PLAYER_SPRITE_SRC_SIDE_TRIM,
  right: PLAYER_SPRITE_SRC_SIDE_TRIM,
};

/** Recorte proporcional — remove bordas transparentes típicas de export AI. */
export function resolveTrimmedAssetSourceRect(
  srcWidth: number,
  srcHeight: number,
  trim: AssetTrimRatios = DEFAULT_TRIM,
): TrimmedSourceRect {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { sx: 0, sy: 0, sw: 0, sh: 0 };
  }

  const top = Math.floor(srcHeight * (trim.top ?? DEFAULT_TRIM.top));
  const bottom = Math.floor(srcHeight * (trim.bottom ?? DEFAULT_TRIM.bottom));
  const left = Math.floor(srcWidth * (trim.left ?? DEFAULT_TRIM.left));
  const right = Math.floor(srcWidth * (trim.right ?? DEFAULT_TRIM.right));

  const sh = Math.max(1, srcHeight - top - bottom);
  const sw = Math.max(1, srcWidth - left - right);

  return { sx: left, sy: top, sw, sh };
}

/** @deprecated Use resolveTrimmedAssetSourceRect */
export function resolveTrimmedPlayerSourceRect(
  srcWidth: number,
  srcHeight: number,
): TrimmedSourceRect {
  return resolveTrimmedAssetSourceRect(srcWidth, srcHeight, DEFAULT_TRIM);
}
