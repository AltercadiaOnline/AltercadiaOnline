import type { TurnOrderResolvedEvent } from '../../shared/events.js';

import { mountBattleEffectBesideFighter } from './battleEffectsLayer.js';

const INITIATIVE_IMPACT_MS = 2400;

/** Popup de ordem de turno — integrado ao cenário de batalha. */
export function showInitiativeImpact(
  anchor: HTMLElement,
  entry: TurnOrderResolvedEvent['payload']['debug'][number],
  orderPosition: number,
): void {
  if (!entry.speedSumEquation && !entry.speedBuildRoster && !entry.initiativeLine) return;

  const doc = anchor.ownerDocument;

  const overlay = doc.createElement('div');
  overlay.className = 'technical-impact technical-impact--initiative technical-impact--scene';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');

  const heading = doc.createElement('div');
  heading.className = 'technical-impact__heading';
  heading.textContent = `Ordem de turno · #${orderPosition + 1}`;
  overlay.appendChild(heading);

  const total = doc.createElement('div');
  total.className = 'technical-impact__total technical-impact__total--initiative';
  total.textContent = String(Math.round(entry.effectiveSpeed));
  overlay.appendChild(total);

  if (entry.speedSumEquation) {
    const sumWrap = doc.createElement('div');
    sumWrap.className = 'technical-impact__section technical-impact__section--sum';
    const sumLabel = doc.createElement('div');
    sumLabel.className = 'technical-impact__subheading';
    sumLabel.textContent = 'Soma da velocidade';
    sumWrap.appendChild(sumLabel);
    const sumBody = doc.createElement('div');
    sumBody.className = 'technical-impact__formula';
    sumBody.textContent = entry.speedSumEquation;
    sumWrap.appendChild(sumBody);
    overlay.appendChild(sumWrap);
  }

  if (entry.speedBuildRoster) {
    const buildWrap = doc.createElement('div');
    buildWrap.className = 'technical-impact__section technical-impact__section--build';
    const buildLabel = doc.createElement('div');
    buildLabel.className = 'technical-impact__subheading';
    buildLabel.textContent = 'Sua build';
    buildWrap.appendChild(buildLabel);
    const buildBody = doc.createElement('div');
    buildBody.className = 'technical-impact__formula';
    buildBody.textContent = entry.speedBuildRoster;
    buildWrap.appendChild(buildBody);
    overlay.appendChild(buildWrap);
  }

  if (entry.initiativeLine) {
    const reconcile = doc.createElement('div');
    reconcile.className = 'technical-impact__reconcile';
    reconcile.textContent = entry.initiativeLine;
    overlay.appendChild(reconcile);
  }

  mountBattleEffectBesideFighter(overlay, anchor, { gapPx: 14 });

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
  } else {
    overlay.classList.add('is-visible');
  }

  const schedule = typeof globalThis.setTimeout === 'function' ? globalThis.setTimeout.bind(globalThis) : setTimeout;
  schedule(() => {
    overlay.classList.add('is-fading');
    schedule(() => overlay.remove(), 380);
  }, INITIATIVE_IMPACT_MS);
}
