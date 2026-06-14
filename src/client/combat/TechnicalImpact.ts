import type { CombatActionBreakdown } from '../../shared/combat/combatActionBreakdown.js';
import {
  formatCombatActionBreakdown,
  formatCombatBreakdownSumEquation,
  formatCombatHitSummary,
  type CombatHitSummaryInput,
} from '../../shared/combat/combatActionBreakdown.js';
import { formatCompactHitMoveLabel } from '../../shared/combat/moveDisplayLabels.js';
import { resolveMoveCombatMeta } from '../../shared/combat/resolveMoveCombatMeta.js';
import { exactOptionalProps } from '../../shared/util/exactOptionalProps.js';
import { mountBattleEffectBesideFighter } from './battleEffectsLayer.js';

export const TECHNICAL_IMPACT_DURATION_MS = 2600;

export type TechnicalImpactShowOptions = {
  readonly durationMs?: number;
  /** Arena: moveset + dano final em vermelho, sem soma segmentada nem pop flutuante. */
  readonly compactScene?: boolean;
};

export type TechnicalImpactPayload = {
  readonly damageTotal?: number;
  readonly attackBreakdown?: CombatActionBreakdown;
  readonly attackTotal?: number;
  readonly protectionTotal?: number;
  readonly defenseBreakdown?: CombatActionBreakdown;
  readonly defenseTotal?: number;
  /** Nome do move exibido no hit compacto da arena. */
  readonly moveName?: string;
  readonly skillId?: string;
};

/** Monta na arena de combate — VFX integrado ao cenário. */
function mountOverlayAtAnchor(overlay: HTMLElement, anchor: HTMLElement): void {
  mountBattleEffectBesideFighter(overlay, anchor, { clampPadding: 12, gapPx: 14 });
  overlay.classList.add('technical-impact--scene');
}

function appendFormulaSection(
  doc: Document,
  block: HTMLElement,
  subheading: string,
  text: string,
  className: string,
): void {
  const wrap = doc.createElement('div');
  wrap.className = `technical-impact__section ${className}`;

  const label = doc.createElement('div');
  label.className = 'technical-impact__subheading';
  label.textContent = subheading;
  wrap.appendChild(label);

  const body = doc.createElement('div');
  body.className = 'technical-impact__formula';
  body.textContent = text;
  wrap.appendChild(body);

  block.appendChild(wrap);
}

function appendImpactBlock(
  doc: Document,
  container: HTMLElement,
  mode: 'damage' | 'protection',
  heading: string,
  highlightTotal: number,
  sumEquation: string | undefined,
  buildRoster: string | undefined,
  sumLabel: string,
): void {
  const block = doc.createElement('div');
  block.className = `technical-impact__block technical-impact__block--${mode}`;

  const headingEl = doc.createElement('div');
  headingEl.className = 'technical-impact__heading';
  headingEl.textContent = heading;
  block.appendChild(headingEl);

  const totalEl = doc.createElement('div');
  totalEl.className = 'technical-impact__total';
  totalEl.textContent = mode === 'damage'
    ? (highlightTotal > 0 ? `-${Math.round(highlightTotal)}` : '0')
    : String(Math.max(0, Math.round(highlightTotal)));
  block.appendChild(totalEl);

  if (sumEquation) {
    appendFormulaSection(doc, block, sumLabel, sumEquation, 'technical-impact__section--sum');
  }
  if (buildRoster) {
    appendFormulaSection(doc, block, 'Sua build', buildRoster, 'technical-impact__section--build');
  }

  container.appendChild(block);
}

/**
 * Impacto Técnico — dano em destaque, soma mecânica e build completa no hit.
 */
function resolveDefenseDisplay(
  payload: TechnicalImpactPayload,
  summary: ReturnType<typeof formatCombatHitSummary>,
): { sumEquation?: string; buildRoster?: string; total: number } | null {
  if (!payload.defenseBreakdown) return null;

  const total = payload.defenseTotal ?? payload.protectionTotal ?? 0;
  const sumEquation =
    summary.defenseSumEquation
    || formatCombatBreakdownSumEquation(payload.defenseBreakdown)
    || formatCombatActionBreakdown(payload.defenseBreakdown);
  const buildRoster = summary.defenseBuildRoster;

  if (!sumEquation && !buildRoster && total <= 0) return null;

  return {
    ...(sumEquation ? { sumEquation } : {}),
    ...(buildRoster ? { buildRoster } : {}),
    total,
  };
}

function resolveMovesetPower(breakdown: CombatActionBreakdown | undefined): number | undefined {
  const line = breakdown?.lines.find((entry) => entry.source === 'moveset');
  if (!line) return undefined;
  return Math.round(line.value);
}

function resolveCompactMoveLabel(payload: TechnicalImpactPayload): string | undefined {
  const fromPayload = payload.moveName?.trim()
    || (payload.skillId ? resolveMoveCombatMeta(payload.skillId)?.name : undefined);
  return formatCompactHitMoveLabel(exactOptionalProps({
    moveName: fromPayload,
    movesetPower: resolveMovesetPower(payload.attackBreakdown),
  }));
}

function appendCompactSceneDamage(
  doc: Document,
  overlay: HTMLElement,
  payload: TechnicalImpactPayload,
): boolean {
  const movesetPower = resolveMovesetPower(payload.attackBreakdown);
  const moveLabel = resolveCompactMoveLabel(payload);
  const damage = Math.max(0, Math.round(payload.damageTotal ?? 0));
  const defenseTotal = Math.round(payload.defenseTotal ?? payload.protectionTotal ?? 0);

  if (moveLabel === undefined && damage <= 0 && defenseTotal <= 0) {
    return false;
  }

  overlay.classList.add('technical-impact--compact-damage');

  if (moveLabel !== undefined) {
    const moveRow = doc.createElement('div');
    moveRow.className = 'technical-impact__move-name';
    moveRow.textContent = moveLabel;
    overlay.appendChild(moveRow);
  }

  if (damage > 0) {
    const finalRow = doc.createElement('div');
    finalRow.className = 'technical-impact__damage-final';
    finalRow.textContent = `−${damage}`;
    overlay.appendChild(finalRow);
  }

  if (defenseTotal > 0 && damage > 0 && movesetPower !== undefined && movesetPower > damage) {
    const defenseHint = doc.createElement('div');
    defenseHint.className = 'technical-impact__defense-hint';
    defenseHint.textContent = `Defesa ${defenseTotal}`;
    overlay.appendChild(defenseHint);
  }

  return true;
}

function appendCompactSceneProtection(
  doc: Document,
  overlay: HTMLElement,
  defenseDisplay: NonNullable<ReturnType<typeof resolveDefenseDisplay>>,
): void {
  overlay.classList.add('technical-impact--compact-protection');
  const row = doc.createElement('div');
  row.className = 'technical-impact__protection-final';
  row.textContent = `▲${Math.max(0, Math.round(defenseDisplay.total))}`;
  overlay.appendChild(row);
}

function mountCompactSceneImpact(
  doc: Document,
  overlay: HTMLElement,
  payload: TechnicalImpactPayload,
  defenseDisplay: ReturnType<typeof resolveDefenseDisplay>,
): boolean {
  const damage = Math.max(0, Math.round(payload.damageTotal ?? 0));
  const hasAttackSide = Boolean(payload.attackBreakdown) || damage > 0;
  let mounted = false;

  if (hasAttackSide) {
    mounted = appendCompactSceneDamage(doc, overlay, payload) || mounted;
  }

  if (defenseDisplay && damage <= 0) {
    appendCompactSceneProtection(doc, overlay, defenseDisplay);
    mounted = true;
  }

  return mounted;
}

export function showTechnicalImpact(
  anchor: HTMLElement,
  payload: TechnicalImpactPayload,
  options: TechnicalImpactShowOptions = {},
): void {
  const durationMs = options.durationMs ?? TECHNICAL_IMPACT_DURATION_MS;
  const doc = anchor.ownerDocument;

  const overlay = doc.createElement('div');
  overlay.className = 'technical-impact';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');

  const defenseTotal = payload.defenseTotal ?? payload.protectionTotal;
  const hitInput = {
    damageReceived: payload.damageTotal ?? 0,
    ...(payload.attackBreakdown ? { attackBreakdown: payload.attackBreakdown } : {}),
    ...(payload.attackTotal !== undefined ? { attackTotal: payload.attackTotal } : {}),
    ...(payload.defenseBreakdown ? { defenseBreakdown: payload.defenseBreakdown } : {}),
    ...(defenseTotal !== undefined ? { defenseTotal } : {}),
  } as CombatHitSummaryInput;

  const summary = formatCombatHitSummary(hitInput);

  const defenseDisplay = resolveDefenseDisplay(payload, summary);
  const hasAttack =
    Boolean(payload.attackBreakdown)
    || Boolean(summary.attackSumEquation)
    || Boolean(summary.attackBuildRoster);
  const hasDefense = defenseDisplay !== null;
  const hasDamage = (payload.damageTotal ?? 0) > 0;

  if (!hasAttack && !hasDefense && !hasDamage && !summary.resultLine) return;

  if (options.compactScene) {
    if (!mountCompactSceneImpact(doc, overlay, payload, defenseDisplay)) return;
  } else {
    if (hasAttack || hasDamage) {
      const attackSum =
        summary.attackSumEquation
        || (payload.attackBreakdown
          ? formatCombatBreakdownSumEquation(payload.attackBreakdown)
          : undefined);
      appendImpactBlock(
        doc,
        overlay,
        'damage',
        'Ataque',
        payload.damageTotal ?? 0,
        attackSum,
        summary.attackBuildRoster,
        'Soma do golpe',
      );
    }

    if (defenseDisplay) {
      appendImpactBlock(
        doc,
        overlay,
        'protection',
        'Defesa',
        defenseDisplay.total,
        defenseDisplay.sumEquation,
        defenseDisplay.buildRoster,
        'Soma da defesa',
      );
    }

    if (summary.resultLine) {
      const reconcile = doc.createElement('div');
      reconcile.className = 'technical-impact__reconcile';
      reconcile.textContent = summary.resultLine;
      overlay.appendChild(reconcile);
    }
  }

  mountOverlayAtAnchor(overlay, anchor);

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
  } else {
    overlay.classList.add('is-visible');
  }

  const schedule = typeof globalThis.setTimeout === 'function' ? globalThis.setTimeout.bind(globalThis) : setTimeout;

  schedule(() => {
    overlay.classList.add('is-fading');
    schedule(() => overlay.remove(), 380);
  }, durationMs);
}

const HEAL_IMPACT_MS = 2200;

/** Feedback visual de cura (moveset Heal / poções). */
export function showHealImpact(anchor: HTMLElement, amount: number): void {
  if (amount <= 0) return;

  const doc = anchor.ownerDocument;
  const overlay = doc.createElement('div');
  overlay.className = 'technical-impact technical-impact--heal';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');

  const heading = doc.createElement('div');
  heading.className = 'technical-impact__heading';
  heading.textContent = 'Cura';
  overlay.appendChild(heading);

  const total = doc.createElement('div');
  total.className = 'technical-impact__total technical-impact__total--heal';
  total.textContent = `+${Math.round(amount)}`;
  overlay.appendChild(total);

  const hint = doc.createElement('div');
  hint.className = 'technical-impact__reconcile';
  hint.textContent = 'HP restaurado';
  overlay.appendChild(hint);

  mountOverlayAtAnchor(overlay, anchor);

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
  } else {
    overlay.classList.add('is-visible');
  }

  const schedule = typeof globalThis.setTimeout === 'function' ? globalThis.setTimeout.bind(globalThis) : setTimeout;

  schedule(() => {
    overlay.classList.add('is-fading');
    schedule(() => overlay.remove(), 380);
  }, HEAL_IMPACT_MS);
}
