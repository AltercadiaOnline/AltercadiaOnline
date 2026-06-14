import type { LootGrantedPayload } from '../../shared/economy/events.js';
import { formatVolts } from '../../shared/economy/premiumCurrency.js';
import { getItemById } from '../../shared/items/itemCatalog.js';

const AUTO_DISMISS_MS = 4500;

function resolveItemLabel(itemId: string): string {
  return getItemById(itemId)?.name ?? itemId;
}

/**
 * Popup informativo — economy-event já aplicou o loot; só feedback visual.
 */
export function showBattleVictoryLootPopup(loot: LootGrantedPayload): Promise<void> {
  return new Promise((resolve) => {
    const doc = document;
    const overlay = doc.createElement('div');
    overlay.className = 'battle-victory-popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Vitória');

    const panel = doc.createElement('div');
    panel.className = 'battle-victory-popup ui-panel';

    const title = doc.createElement('h2');
    title.className = 'battle-victory-popup__title';
    title.textContent = 'Vitória!';

    const subtitle = doc.createElement('p');
    subtitle.className = 'battle-victory-popup__subtitle';
    subtitle.textContent = 'Você obteve:';

    const list = doc.createElement('ul');
    list.className = 'battle-victory-popup__list';

    if (loot.dollarVolt > 0) {
      const voltRow = doc.createElement('li');
      voltRow.textContent = `${formatVolts(loot.dollarVolt)} VOLTS`;
      list.appendChild(voltRow);
    }

    for (const itemId of loot.itemIds) {
      const row = doc.createElement('li');
      row.textContent = resolveItemLabel(itemId);
      list.appendChild(row);
    }

    if (list.childElementCount === 0) {
      const empty = doc.createElement('li');
      empty.textContent = 'Nenhum loot desta vez.';
      list.appendChild(empty);
    }

    const dismissBtn = doc.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'battle-victory-popup__btn';
    dismissBtn.textContent = 'Continuar';

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      overlay.remove();
      resolve();
    };

    dismissBtn.addEventListener('click', finish);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish();
    });

    panel.append(title, subtitle, list, dismissBtn);
    overlay.appendChild(panel);
    doc.body.appendChild(overlay);

    const timer = window.setTimeout(finish, AUTO_DISMISS_MS);
    overlay.addEventListener('click', () => clearTimeout(timer), { once: true });
    dismissBtn.addEventListener('click', () => clearTimeout(timer), { once: true });
  });
}
