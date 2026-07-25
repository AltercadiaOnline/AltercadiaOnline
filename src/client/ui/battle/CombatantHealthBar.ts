// @ts-nocheck
import { readCombatantVital } from '../../combat/combatVitalsDisplay.js';
import { readActiveStatusesFromCombatant } from '../../hud/activeStatusAdapter.js';
import { renderStatusContainer } from './StatusDisplay.js';
/**
 * HUD de vitals — barra de HP + faixa de status.
 * Espelha snapshot do servidor; não calcula efeitos.
 */
export class CombatantHealthBar {
    els;
    constructor(elements) {
        this.els = elements;
    }
    sync(combatant) {
        const { hp, maxHp } = readCombatantVital(combatant);
        if (this.els.name)
            this.els.name.textContent = combatant.name;
        this.applyHpBar(hp, maxHp);
        this.syncStatusStrip(combatant);
    }
    syncStatusStrip(combatant) {
        const container = this.els.statusContainer;
        if (!container)
            return;
        const chips = readActiveStatusesFromCombatant(combatant);
        renderStatusContainer(container, chips);
    }
    updateHp(hp, maxHp) {
        this.applyHpBar(hp, maxHp);
    }
    applyHpBar(hp, maxHp) {
        const max = Math.max(1, maxHp);
        const ratio = Math.min(100, Math.max(0, (hp / max) * 100));
        if (this.els.hpFill)
            this.els.hpFill.style.width = `${ratio}%`;
        if (this.els.hpText)
            this.els.hpText.textContent = `${Math.max(0, Math.ceil(hp))} / ${max}`;
    }
}
