// @ts-nocheck
/**
 * Número de dano flutuante sobre o retrato do alvo.
 */
export class BattleFloatingText {
    show(damage, anchor) {
        const { parent } = anchor;
        const doc = parent.ownerDocument;
        const el = doc.createElement('span');
        el.className = 'battle-floating-damage';
        el.textContent = String(Math.max(0, Math.round(damage)));
        el.setAttribute('aria-hidden', 'true');
        parent.appendChild(el);
        const remove = () => el.remove();
        el.addEventListener('animationend', remove, { once: true });
        setTimeout(remove, 1200);
    }
}
