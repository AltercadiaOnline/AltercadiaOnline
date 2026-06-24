import { GAME_CONFIG } from '../constants/GameConfig.js';

/** Tolerância de proporção (10%) antes do tint de aviso. */
export const ASSET_SCALE_PROPORTION_TOLERANCE = 0.1;

/** Tint avermelhado — asset fora do padrão de proporção. */
export const ASSET_WARNING_TINT_COLOR = 0xff6666;

export const GAME_ASSET_TARGETS = {
  tile: {
    width: GAME_CONFIG.TILE_SIZE,
    height: GAME_CONFIG.TILE_SIZE,
  },
  player: {
    width: GAME_CONFIG.PLAYER_WIDTH,
    height: GAME_CONFIG.PLAYER_HEIGHT,
  },
  npc: {
    width: GAME_CONFIG.PLAYER_WIDTH,
    height: GAME_CONFIG.PLAYER_HEIGHT,
  },
} as const;

export type AssetScaleEvaluation = {
  readonly forcedResize: boolean;
  readonly proportionMismatch: boolean;
};

export type NormalizeAssetSprite = {
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly fileName: string;
  setDisplaySize: (targetWidth: number, targetHeight: number) => void;
  setWarningTint: (active: boolean) => void;
};

const loggedAssetAlerts = new Set<string>();

/** Compara proporção fonte vs alvo — alerta visual acima de 10% de diferença. */
export function evaluateAssetScale(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  tolerance: number = ASSET_SCALE_PROPORTION_TOLERANCE,
): AssetScaleEvaluation {
  const forcedResize = sourceWidth !== targetWidth || sourceHeight !== targetHeight;

  if (sourceWidth <= 0 || sourceHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return { forcedResize, proportionMismatch: false };
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  const proportionMismatch =
    Math.abs(sourceRatio - targetRatio) / targetRatio > tolerance;

  return { forcedResize, proportionMismatch };
}

export function emitAssetScaleAlert(
  fileName: string,
  targetWidth: number,
  targetHeight: number,
): void {
  const key = `${fileName}@${targetWidth}x${targetHeight}`;
  if (loggedAssetAlerts.has(key)) {
    return;
  }
  loggedAssetAlerts.add(key);
  console.warn(
    `[ASSET ALERT] O arquivo ${fileName} não segue o padrão de escala e foi forçado para ${targetWidth}x${targetHeight}.`,
  );
}

export function resetAssetScaleAlerts(): void {
  loggedAssetAlerts.clear();
}

/**
 * Normalizador ditador — força dimensões de exibição e sinaliza assets fora do padrão.
 * Ignora tamanho original; `targetWidth` × `targetHeight` são sempre aplicados.
 */
export function normalizeAsset(
  sprite: NormalizeAssetSprite,
  targetWidth: number,
  targetHeight: number,
): AssetScaleEvaluation {
  const evaluation = evaluateAssetScale(
    sprite.sourceWidth,
    sprite.sourceHeight,
    targetWidth,
    targetHeight,
  );

  sprite.setDisplaySize(targetWidth, targetHeight);

  if (evaluation.forcedResize) {
    emitAssetScaleAlert(sprite.fileName, targetWidth, targetHeight);
  }

  sprite.setWarningTint(evaluation.proportionMismatch);
  return evaluation;
}

export type CanvasAssetDrawPlan = AssetScaleEvaluation & {
  readonly targetWidth: number;
  readonly targetHeight: number;
};

/** Planeja draw canvas com escala forçada + alertas (sem desenhar). */
export function planCanvasAssetDraw(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fileName: string,
): CanvasAssetDrawPlan {
  const evaluation = evaluateAssetScale(sourceWidth, sourceHeight, targetWidth, targetHeight);

  if (evaluation.forcedResize) {
    emitAssetScaleAlert(fileName, targetWidth, targetHeight);
  }

  return {
    ...evaluation,
    targetWidth,
    targetHeight,
  };
}

/** Overlay avermelhado pós-draw quando proporção diverge > 10%. */
export function applyCanvasAssetWarningTint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = '#ff5555';
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}
