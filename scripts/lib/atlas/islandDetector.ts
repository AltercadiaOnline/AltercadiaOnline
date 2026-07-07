export type PixelIsland = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly pixelCount: number;
};

/**
 * Agrupa pixels com alpha > threshold em ilhas (componentes conexos 4-vizinhos).
 * Usado em folhas com sprites soltos; tilesets em grade usam modo `grid-tileset`.
 */
export function detectPixelIslands(
  rgba: Buffer,
  width: number,
  height: number,
  alphaThreshold = 8,
): PixelIsland[] {
  const visited = new Uint8Array(width * height);
  const islands: PixelIsland[] = [];

  const index = (x: number, y: number) => y * width + x;
  const alphaAt = (x: number, y: number) => rgba[index(x, y) * 4 + 3] ?? 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = index(x, y);
      if (visited[idx] || alphaAt(x, y) <= alphaThreshold) continue;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let pixelCount = 0;

      const stack: Array<{ readonly x: number; readonly y: number }> = [{ x, y }];
      visited[idx] = 1;

      while (stack.length > 0) {
        const current = stack.pop()!;
        pixelCount += 1;
        minX = Math.min(minX, current.x);
        maxX = Math.max(maxX, current.x);
        minY = Math.min(minY, current.y);
        maxY = Math.max(maxY, current.y);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = current.x + dx;
          const ny = current.y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = index(nx, ny);
          if (visited[nIdx] || alphaAt(nx, ny) <= alphaThreshold) continue;
          visited[nIdx] = 1;
          stack.push({ x: nx, y: ny });
        }
      }

      islands.push({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        pixelCount,
      });
    }
  }

  return islands.sort((a, b) => b.pixelCount - a.pixelCount);
}
