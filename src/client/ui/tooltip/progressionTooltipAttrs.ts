import type { ProgressionTooltipPayload } from '../../../shared/progression/progressionTooltipContent.js';

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** Atributos data-* para tooltip de progressão (delegação global no hover). */
export function renderProgressionTooltipAttrs(payload: ProgressionTooltipPayload): string {
  const atMax = payload.atMax || payload.threshold <= 0;
  return [
    'data-progression-tooltip=""',
    `data-progression-kind="${payload.kind}"`,
    `data-progression-title="${escapeAttr(payload.title)}"`,
    `data-progression-percent="${Math.floor(payload.percent)}"`,
    `data-progression-current="${Math.floor(payload.current)}"`,
    `data-progression-threshold="${Math.floor(payload.threshold)}"`,
    `data-progression-next-label="${escapeAttr(payload.nextLabel)}"`,
    atMax ? 'data-progression-at-max="true"' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function patchProgressionTooltipAttrs(
  element: HTMLElement,
  payload: ProgressionTooltipPayload,
): void {
  element.setAttribute('data-progression-tooltip', '');
  element.dataset.progressionKind = payload.kind;
  element.dataset.progressionTitle = payload.title;
  element.dataset.progressionPercent = String(Math.floor(payload.percent));
  element.dataset.progressionCurrent = String(Math.floor(payload.current));
  element.dataset.progressionThreshold = String(Math.floor(payload.threshold));
  element.dataset.progressionNextLabel = payload.nextLabel;
  if (payload.atMax || payload.threshold <= 0) {
    element.dataset.progressionAtMax = 'true';
  } else {
    delete element.dataset.progressionAtMax;
  }
}

export function readProgressionTooltipPayload(element: HTMLElement): ProgressionTooltipPayload | null {
  if (!element.hasAttribute('data-progression-tooltip')) return null;

  const kind = element.dataset.progressionKind;
  if (
    kind !== 'player-level'
    && kind !== 'pet-affinity'
    && kind !== 'move-mastery'
    && kind !== 'marco-node'
  ) {
    return null;
  }

  const title = element.dataset.progressionTitle ?? 'Progressão';
  const percent = Number(element.dataset.progressionPercent ?? 0);
  const current = Number(element.dataset.progressionCurrent ?? 0);
  const threshold = Number(element.dataset.progressionThreshold ?? 0);
  const nextLabel = element.dataset.progressionNextLabel ?? 'próximo nível';
  const atMax = element.dataset.progressionAtMax === 'true';

  return {
    kind,
    title,
    percent: Number.isFinite(percent) ? percent : 0,
    current: Number.isFinite(current) ? current : 0,
    threshold: Number.isFinite(threshold) ? threshold : 0,
    nextLabel,
    ...(atMax ? { atMax: true } : {}),
  };
}
