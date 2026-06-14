export type HitSpark = {
  readonly x: number;
  readonly y: number;
  readonly bornAtMs: number;
  readonly durationMs: number;
  readonly radius: number;
};

export function createHitSpark(normX: number, normY: number, nowMs: number): HitSpark {
  return {
    x: normX,
    y: normY,
    bornAtMs: nowMs,
    durationMs: 320,
    radius: 0.045,
  };
}

export function renderHitSparks(
  ctx: CanvasRenderingContext2D,
  sparks: readonly HitSpark[],
  nowMs: number,
  width: number,
  height: number,
): void {
  for (const spark of sparks) {
    const t = (nowMs - spark.bornAtMs) / spark.durationMs;
    if (t >= 1) continue;

    const px = spark.x * width;
    const py = spark.y * height;
    const alpha = 1 - t;
    const r = spark.radius * width * (0.6 + t * 1.4);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffe08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 120, 80, 0.85)';
    ctx.font = `bold ${Math.max(10, width * 0.028)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (t < 0.45) {
      ctx.fillText('BOOM', px, py);
    }
    ctx.restore();
  }
}

export function pruneHitSparks(sparks: HitSpark[], nowMs: number): HitSpark[] {
  return sparks.filter((spark) => nowMs - spark.bornAtMs < spark.durationMs);
}
