/**
 * FloatingHUD — barras HP/PP empilhadas com Ghost Bar.
 *
 * Props:
 * - hp: { current, max }
 * - pp: { current, max }
 */
import {
  computeVitalRatio,
  formatVitalLabel,
  GHOST_BAR_DELAY_MS,
  GHOST_BAR_DURATION_MS,
  resolveHpTier,
  type FloatingHudProps,
  type FloatingHudVitalProps,
  type VitalBarElements,
  type VitalBarState,
  type VitalKind,
} from './floatingHudShared.js';

export {
  computeVitalRatio,
  formatVitalLabel,
  resolveHpTier,
  type FloatingHudProps,
  type FloatingHudVitalProps,
  type HpTier,
} from './floatingHudShared.js';

export const FLOATING_HUD_ROOT_CLASS = 'floating-hud';

export class FloatingHUD {
  private readonly root: HTMLElement;
  private readonly bars: Record<VitalKind, VitalBarElements>;
  private readonly state: Record<VitalKind, VitalBarState> = {
    hp: { lastRatio: 100, ghostTimer: null },
    pp: { lastRatio: 100, ghostTimer: null },
  };

  constructor(parent: HTMLElement, props: FloatingHudProps) {
    this.root = parent.ownerDocument.createElement('div');
    this.root.className = FLOATING_HUD_ROOT_CLASS;
    this.root.setAttribute('aria-label', 'Vitals');

    this.bars = {
      hp: this.createVitalRow('hp', 'HP'),
      pp: this.createVitalRow('pp', 'PP'),
    };

    this.root.append(this.bars.hp.row, this.bars.pp.row);
    parent.appendChild(this.root);

    this.updateProps(props);
  }

  getElement(): HTMLElement {
    return this.root;
  }

  updateProps(props: FloatingHudProps): void {
    this.applyVital('hp', props.hp);
    this.applyVital('pp', props.pp);
  }

  destroy(): void {
    for (const kind of ['hp', 'pp'] as const) {
      const timer = this.state[kind].ghostTimer;
      if (timer) clearTimeout(timer);
    }
    this.root.remove();
  }

  private createVitalRow(kind: VitalKind, label: string): VitalBarElements {
    const doc = this.root.ownerDocument;

    const row = doc.createElement('div');
    row.className = `floating-hud__row floating-hud__row--${kind}`;

    const labelEl = doc.createElement('span');
    labelEl.className = 'floating-hud__label';
    labelEl.textContent = label;

    const track = doc.createElement('div');
    track.className = 'floating-hud__track';
    track.setAttribute('role', 'progressbar');

    const ghost = doc.createElement('div');
    ghost.className = 'floating-hud__ghost';

    const fill = doc.createElement('div');
    fill.className = 'floating-hud__fill';

    track.append(ghost, fill);

    const value = doc.createElement('span');
    value.className = 'floating-hud__value';

    row.append(labelEl, track, value);
    return { row, track, ghost, fill, value };
  }

  private applyVital(kind: VitalKind, vital: FloatingHudVitalProps): void {
    const bar = this.bars[kind];
    const slot = this.state[kind];
    const ratio = computeVitalRatio(vital.current, vital.max);
    const label = formatVitalLabel(vital.current, vital.max);

    bar.value.textContent = label;
    bar.track.setAttribute('aria-valuenow', String(Math.max(0, Math.ceil(vital.current))));
    bar.track.setAttribute('aria-valuemin', '0');
    bar.track.setAttribute('aria-valuemax', String(Math.ceil(Math.max(1, vital.max))));
    bar.track.setAttribute('aria-label', `${kind.toUpperCase()} ${label}`);

    if (kind === 'hp') {
      const tier = resolveHpTier(ratio);
      bar.row.dataset.tier = tier;
      bar.row.classList.toggle('is-critical', ratio <= 20);
    }

    const tookDamage = ratio < slot.lastRatio;

    if (tookDamage) {
      this.setBarWidth(bar.fill, ratio, true);
      this.scheduleGhostCatchUp(kind, bar.ghost, ratio);
    } else {
      if (slot.ghostTimer) {
        clearTimeout(slot.ghostTimer);
        slot.ghostTimer = null;
      }
      this.setBarWidth(bar.ghost, ratio, false);
      this.setBarWidth(bar.fill, ratio, true);
    }

    slot.lastRatio = ratio;
  }

  private scheduleGhostCatchUp(kind: VitalKind, ghost: HTMLElement, targetRatio: number): void {
    const slot = this.state[kind];
    if (slot.ghostTimer) clearTimeout(slot.ghostTimer);

    ghost.style.transition = 'none';

    slot.ghostTimer = setTimeout(() => {
      slot.ghostTimer = null;
      ghost.style.transition = `width ${GHOST_BAR_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      ghost.style.width = `${targetRatio}%`;
    }, GHOST_BAR_DELAY_MS);
  }

  private setBarWidth(el: HTMLElement, ratio: number, animate: boolean): void {
    el.style.transition = animate ? 'width 0.18s ease-out' : 'none';
    el.style.width = `${ratio}%`;
  }
}

/** Monta FloatingHUD num contentor existente ou cria um wrapper. */
export function mountFloatingHUD(
  parent: HTMLElement,
  props: FloatingHudProps,
): FloatingHUD {
  return new FloatingHUD(parent, props);
}
