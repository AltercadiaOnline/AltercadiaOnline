// @ts-nocheck
import { hasLootContent } from '../../shared/loot/lootTypes.js';
import { formatVolts } from '../../shared/economy/premiumCurrency.js';
import { getItemById } from '../../shared/items/itemCatalog.js';
function resolveItemLabel(itemId) {
    return getItemById(itemId)?.name ?? itemId;
}
function rarityLabel(rarity) {
    switch (rarity) {
        case 'epic': return 'Épico';
        case 'rare': return 'Raro';
        case 'uncommon': return 'Incomum';
        default: return 'Comum';
    }
}
/**
 * Janela de saque pós-batalha — exibe preview autoritativo do servidor.
 * Persistência só ocorre após "Coletar".
 */
export function showBattleLootWindow(options) {
    const { preview, onCollect, onDismiss } = options;
    if (!hasLootContent(preview)) {
        return Promise.resolve('closed');
    }
    return new Promise((resolve) => {
        const doc = document;
        const overlay = doc.createElement('div');
        overlay.className = 'battle-loot-window-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Saque da batalha');
        const panel = doc.createElement('div');
        panel.className = 'battle-loot-window ui-panel';
        const title = doc.createElement('h2');
        title.className = 'battle-loot-window__title';
        title.textContent = 'Saque';
        const subtitle = doc.createElement('p');
        subtitle.className = 'battle-loot-window__subtitle';
        subtitle.textContent = 'Recompensas disponíveis:';
        const list = doc.createElement('ul');
        list.className = 'battle-loot-window__list';
        if (preview.voltReward > 0) {
            const voltRow = doc.createElement('li');
            voltRow.className = 'battle-loot-window__row battle-loot-window__row--currency';
            voltRow.textContent = `${formatVolts(preview.voltReward)} VOLTS`;
            list.appendChild(voltRow);
        }
        for (const item of preview.items) {
            const row = doc.createElement('li');
            row.className = `battle-loot-window__row battle-loot-window__row--${item.rarity}`;
            const qty = item.quantity > 1 ? ` ×${item.quantity}` : '';
            row.textContent = `${resolveItemLabel(item.itemId)}${qty} — ${rarityLabel(item.rarity)}`;
            list.appendChild(row);
        }
        const actions = doc.createElement('div');
        actions.className = 'battle-loot-window__actions';
        const collectBtn = doc.createElement('button');
        collectBtn.type = 'button';
        collectBtn.className = 'battle-loot-window__btn battle-loot-window__btn--primary';
        collectBtn.textContent = 'Coletar';
        const closeBtn = doc.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'battle-loot-window__btn';
        closeBtn.textContent = 'Fechar';
        let settled = false;
        const finish = (result) => {
            if (settled)
                return;
            settled = true;
            overlay.remove();
            resolve(result);
        };
        collectBtn.addEventListener('click', () => {
            collectBtn.disabled = true;
            closeBtn.disabled = true;
            collectBtn.textContent = 'Coletando…';
            void onCollect().then((ok) => {
                if (ok) {
                    finish('collected');
                    return;
                }
                collectBtn.disabled = false;
                closeBtn.disabled = false;
                collectBtn.textContent = 'Coletar';
            });
        });
        closeBtn.addEventListener('click', () => {
            onDismiss?.();
            finish('closed');
        });
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                onDismiss?.();
                finish('closed');
            }
        });
        actions.append(collectBtn, closeBtn);
        panel.append(title, subtitle, list, actions);
        overlay.appendChild(panel);
        doc.body.appendChild(overlay);
        collectBtn.focus();
    });
}
/** @deprecated Use showBattleLootWindow */
export { showBattleLootWindow as showBattleVictoryLootPopup };
