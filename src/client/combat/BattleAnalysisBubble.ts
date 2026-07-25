// @ts-nocheck
import { formatCombatBreakdownLine } from '../../shared/combat/combatActionBreakdown.js';
export const BATTLE_ANALYSIS_BUBBLE_MS = 1500;
function lineClassForValue(breakdown, line) {
    if (line.key === 'base')
        return 'battle-analysis-bubble__segment--base';
    if (line.value < 0)
        return 'battle-analysis-bubble__segment--penalty';
    return breakdown.kind === 'attack'
        ? 'battle-analysis-bubble__segment--bonus'
        : 'battle-analysis-bubble__segment--defense';
}
function renderBreakdownSegments(doc, container, breakdown) {
    const visible = breakdown.lines.filter((line) => line.key === 'base' || line.value !== 0);
    visible.forEach((line, index) => {
        if (index > 0) {
            const sep = doc.createElement('span');
            sep.className = 'battle-analysis-bubble__sep';
            sep.textContent = '|';
            container.appendChild(sep);
        }
        const segment = doc.createElement('span');
        segment.className = `battle-analysis-bubble__segment ${lineClassForValue(breakdown, line)}`;
        segment.textContent = formatCombatBreakdownLine(breakdown, line);
        container.appendChild(segment);
    });
}
/** Balão terminal de decomposição — ancorado ao retrato do combatente. */
export function showBattleAnalysisBubble(anchor, breakdown, durationMs = BATTLE_ANALYSIS_BUBBLE_MS) {
    const doc = anchor.ownerDocument;
    const host = anchor.closest('#scene-combat') ?? doc.body;
    const bubble = doc.createElement('div');
    bubble.className = `battle-analysis-bubble battle-analysis-bubble--${breakdown.kind}`;
    bubble.setAttribute('role', 'status');
    bubble.setAttribute('aria-live', 'polite');
    bubble.dataset.breakdownKind = breakdown.kind;
    const label = doc.createElement('span');
    label.className = 'battle-analysis-bubble__tag';
    label.textContent = breakdown.kind === 'attack' ? 'ATK' : 'DEF';
    const body = doc.createElement('div');
    body.className = 'battle-analysis-bubble__body';
    renderBreakdownSegments(doc, body, breakdown);
    bubble.append(label, body);
    host.appendChild(bubble);
    const anchorRect = anchor.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const isAlly = anchor.dataset.side === 'player' || anchor.classList.contains('battle-portrait--player');
    bubble.style.left = `${anchorRect.left - hostRect.left + anchorRect.width * 0.5}px`;
    bubble.style.top = `${anchorRect.top - hostRect.top + (isAlly ? -8 : 12)}px`;
    requestAnimationFrame(() => bubble.classList.add('is-visible'));
    window.setTimeout(() => {
        bubble.classList.add('is-fading');
        bubble.addEventListener('transitionend', () => bubble.remove(), { once: true });
        window.setTimeout(() => bubble.remove(), 480);
    }, durationMs);
}
