export type PackRect = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
};

export type PackedRect = PackRect & {
  readonly x: number;
  readonly y: number;
};

/**
 * Empacotamento em prateleiras (shelf) — determinístico, adequado para build offline.
 */
export function packRectsShelf(
  items: readonly PackRect[],
  maxWidth: number,
  padding: number,
): { readonly width: number; readonly height: number; readonly packed: readonly PackedRect[] } {
  const sorted = [...items].sort((a, b) => b.height - a.height || b.width - a.width);

  let shelfY = padding;
  let shelfHeight = 0;
  let cursorX = padding;
  let atlasWidth = padding;
  let atlasHeight = padding;

  const packed: PackedRect[] = [];

  for (const item of sorted) {
    const w = item.width + padding;
    const h = item.height + padding;

    if (cursorX + w + padding > maxWidth) {
      shelfY += shelfHeight;
      cursorX = padding;
      shelfHeight = 0;
    }

    packed.push({
      ...item,
      x: cursorX,
      y: shelfY,
    });

    cursorX += w;
    shelfHeight = Math.max(shelfHeight, h);
    atlasWidth = Math.max(atlasWidth, cursorX);
    atlasHeight = Math.max(atlasHeight, shelfY + shelfHeight);
  }

  return {
    width: atlasWidth + padding,
    height: atlasHeight + padding,
    packed,
  };
}
