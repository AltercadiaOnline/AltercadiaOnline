import { readCombatantVital } from '../../combat/combatVitalsDisplay.js';
import type { Combatant } from '../../../shared/types.js';
import { readActiveStatusesFromCombatant } from '../../hud/activeStatusAdapter.js';
import { renderStatusContainer } from './StatusDisplay.js';

export type CombatantHealthBarElements = {
  readonly hpFill?: HTMLElement | null;
  readonly hpText?: HTMLElement | null;
  readonly statusContainer?: HTMLElement | null;
  readonly name?: HTMLElement | null;
  readonly classLabel?: HTMLElement | null;
};

/**
 * HUD de vitals — barra de HP + faixa de status.
 * Espelha snapshot do servidor; não calcula efeitos.
 */
export class CombatantHealthBar {
  private readonly els: CombatantHealthBarElements;

  constructor(elements: CombatantHealthBarElements) {
    this.els = elements;
  }

  sync(combatant: Combatant): void {
    const { hp, maxHp } = readCombatantVital(combatant);
    if (this.els.name) this.els.name.textContent = combatant.name;
    this.applyHpBar(hp, maxHp);
    this.syncStatusStrip(combatant);
  }

  syncStatusStrip(combatant: Combatant): void {
    const container = this.els.statusContainer;
    if (!container) return;
    const chips = readActiveStatusesFromCombatant(combatant);
    renderStatusContainer(container, chips);
  }

  updateHp(hp: number, maxHp: number): void {
    this.applyHpBar(hp, maxHp);
  }

  private applyHpBar(hp: number, maxHp: number): void {
    const max = Math.max(1, maxHp);
    const ratio = Math.min(100, Math.max(0, (hp / max) * 100));
    if (this.els.hpFill) this.els.hpFill.style.width = `${ratio}%`;
    if (this.els.hpText) this.els.hpText.textContent = `${Math.max(0, Math.ceil(hp))} / ${max}`;
  }
}
