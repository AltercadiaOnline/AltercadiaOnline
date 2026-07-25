// @ts-nocheck
import { snapToPixel } from '../../render/pixelSnap.js';
import { toScreenCoords } from '../screenCoords.js';
import { disableCanvasImageSmoothing } from '../../layout/gamePixelScale.js';
import { NAMETAG_VIEWPORT_MARGIN_PX } from '../nametagRenderer.js';
import { SPEECH_BUBBLE_MAX_LINES, SPEECH_BUBBLE_OFFSET_X_PX, } from '../../../shared/world/speechBubbleConstants.js';
import { layoutSpeechBubbleLines } from './layoutSpeechBubbleLines.js';
const FONT = '600 9px system-ui, -apple-system, "Segoe UI", sans-serif';
const MAX_WIDTH_PX = 148;
const PAD_X = 6;
const PAD_Y = 4;
const LINE_HEIGHT = 11;
const RADIUS = 4;
function measureBubble(ctx, text) {
    ctx.font = FONT;
    const contentWidth = MAX_WIDTH_PX - PAD_X * 2;
    const lines = layoutSpeechBubbleLines(ctx, text, contentWidth, SPEECH_BUBBLE_MAX_LINES);
    let maxLine = 0;
    for (const line of lines) {
        maxLine = Math.max(maxLine, ctx.measureText(line).width);
    }
    const width = Math.min(MAX_WIDTH_PX, Math.ceil(maxLine) + PAD_X * 2);
    const height = lines.length * LINE_HEIGHT + PAD_Y * 2;
    return { width, height, lines };
}
function isBubbleInViewport(camera, worldX, worldY, width, height) {
    const margin = NAMETAG_VIEWPORT_MARGIN_PX;
    const minX = camera.x - margin;
    const minY = camera.y - margin;
    const maxX = camera.x + camera.visibleWorldWidth + margin;
    const maxY = camera.y + camera.visibleWorldHeight + margin;
    const left = worldX - width / 2;
    const top = worldY - height;
    return left <= maxX && left + width >= minX && top <= maxY && top + height >= minY;
}
/**
 * @deprecated Balões renderizados em DOM via speechBubbleDomLayer (fora do scale do canvas).
 * Mantido para referência de layout/medidas.
 */
export function drawSpeechBubbles(ctx, bubbles, camera, now = Date.now()) {
    if (bubbles.length === 0)
        return;
    ctx.save();
    disableCanvasImageSmoothing(ctx);
    ctx.font = FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const bubble of bubbles) {
        const alpha = bubble.getAlpha(now);
        if (alpha <= 0)
            continue;
        const anchorY = bubble.drawAnchorY;
        const { width, height, lines } = measureBubble(ctx, bubble.text);
        const worldX = bubble.worldX + SPEECH_BUBBLE_OFFSET_X_PX;
        const worldY = anchorY - height;
        if (!isBubbleInViewport(camera, worldX, worldY, width, height))
            continue;
        const { screenX, screenY } = toScreenCoords(camera, worldX, worldY);
        const x = snapToPixel(screenX);
        const y = snapToPixel(screenY);
        const left = snapToPixel(x - width / 2);
        const top = snapToPixel(y);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(left, top, width, height, RADIUS);
        }
        else {
            ctx.rect(left, top, width, height);
        }
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#000000';
        let lineY = snapToPixel(top + PAD_Y);
        for (const line of lines) {
            ctx.fillText(line, x, lineY);
            lineY = snapToPixel(lineY + LINE_HEIGHT);
        }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}
