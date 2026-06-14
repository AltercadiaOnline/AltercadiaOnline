import type { LootRevealSlot } from '../../../shared/loot/lootRevealSlots.js';
import { LOOT_REVEAL_SLOT_COUNT } from '../../../shared/loot/lootRevealSlots.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import {
  resolveInventoryItemAbbrev,
  resolveInventoryItemLabel,
} from '../inventory/inventoryItemDisplay.js';

export type LootRevealOptions = {
  readonly slots: readonly LootRevealSlot[];
  readonly mountRoot: HTMLElement;
  /** Hook para SFX — use #sfx-loot-reveal ou callback customizado. */
  readonly onRevealSound?: () => void;
};

export type LootRevealController = {
  readonly root: HTMLElement;
  revealSlot(index: number): void;
  revealAll(): void;
  allRevealed(): boolean;
  destroy(): void;
};

const REVEAL_ANIM_MS = 420;

function playRevealSound(custom?: () => void): void {
  if (custom) {
    custom();
    return;
  }
  const el = document.querySelector<HTMLAudioElement>('#sfx-loot-reveal');
  if (!el) return;
  el.currentTime = 0;
  void el.play().catch(() => undefined);
}

function rarityClass(rarity: LootRevealSlot['rarity']): string {
  if (!rarity) return '';
  return `loot-reveal__slot--rarity-${rarity}`;
}

function buildRevealedContent(slot: LootRevealSlot): { html: string; aria: string; rewardClass: string } {
  if (slot.kind === 'EMPTY') {
    return {
      html: '<span class="loot-reveal__icon loot-reveal__icon--empty">—</span><span class="loot-reveal__label">Vazio</span>',
      aria: 'Slot vazio',
      rewardClass: 'loot-reveal__slot--empty-reward',
    };
  }
  if (slot.kind === 'GOLD') {
    const amount = slot.voltAmount ?? 0;
    return {
      html: `<span class="loot-reveal__icon loot-reveal__icon--gold">⚡</span><span class="loot-reveal__label">${formatVolts(amount)} V</span>`,
      aria: `${formatVolts(amount)} Volts`,
      rewardClass: 'loot-reveal__slot--gold',
    };
  }
  const itemId = slot.itemId ?? 'unknown';
  const abbrev = resolveInventoryItemAbbrev(itemId);
  const label = resolveInventoryItemLabel(itemId);
  return {
    html: `<span class="loot-reveal__icon loot-reveal__icon--item">${abbrev}</span><span class="loot-reveal__label">${label}</span>`,
    aria: label,
    rewardClass: `loot-reveal__slot--item ${rarityClass(slot.rarity)}`.trim(),
  };
}

/**
 * Gerencia estado oculto dos 4 slots até o jogador revelar (clique individual ou Revelar Tudo).
 */
export function mountLootReveal(options: LootRevealOptions): LootRevealController {
  const authoritative = options.slots.slice(0, LOOT_REVEAL_SLOT_COUNT);
  while (authoritative.length < LOOT_REVEAL_SLOT_COUNT) {
    authoritative.push({ kind: 'EMPTY' });
  }

  const revealed = new Array<boolean>(LOOT_REVEAL_SLOT_COUNT).fill(false);
  const root = document.createElement('div');
  root.className = 'loot-reveal';

  const slotsRow = document.createElement('div');
  slotsRow.className = 'loot-reveal__slots';
  slotsRow.setAttribute('role', 'group');
  slotsRow.setAttribute('aria-label', 'Revelação de loot');

  const slotButtons: HTMLButtonElement[] = [];

  for (let index = 0; index < LOOT_REVEAL_SLOT_COUNT; index += 1) {
    const slotData = authoritative[index] ?? { kind: 'EMPTY' as const };
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'loot-reveal__slot loot-reveal__slot--hidden';
    btn.dataset.index = String(index);
    btn.setAttribute('aria-label', `Slot ${index + 1} — toque para revelar`);

    const back = document.createElement('span');
    back.className = 'loot-reveal__face loot-reveal__face--back';
    back.innerHTML = '<span class="loot-reveal__mystery">?</span>';

    const front = document.createElement('span');
    front.className = 'loot-reveal__face loot-reveal__face--front';
    front.setAttribute('aria-hidden', 'true');
    const { html, aria, rewardClass } = buildRevealedContent(slotData);
    front.innerHTML = html;
    front.dataset.rewardClass = rewardClass;
    front.dataset.ariaLabel = aria;

    btn.append(back, front);
    btn.addEventListener('click', () => revealSlot(index));
    slotButtons.push(btn);
    slotsRow.appendChild(btn);
  }

  const revealAllBtn = document.createElement('button');
  revealAllBtn.type = 'button';
  revealAllBtn.className = 'loot-reveal__reveal-all';
  revealAllBtn.textContent = 'Revelar Tudo';
  revealAllBtn.addEventListener('click', () => revealAll());

  root.append(slotsRow, revealAllBtn);
  options.mountRoot.appendChild(root);

  function applyRevealedVisual(btn: HTMLButtonElement, index: number): void {
    const front = btn.querySelector<HTMLElement>('.loot-reveal__face--front');
    const rewardClass = front?.dataset.rewardClass ?? '';
    btn.classList.remove('loot-reveal__slot--hidden', 'loot-reveal__slot--animating');
    btn.classList.add('loot-reveal__slot--revealed', ...rewardClass.split(/\s+/).filter(Boolean));
    btn.setAttribute('aria-label', front?.dataset.ariaLabel ?? `Slot ${index + 1}`);
    btn.disabled = true;
    const back = btn.querySelector('.loot-reveal__face--back');
    back?.setAttribute('aria-hidden', 'true');
    front?.removeAttribute('aria-hidden');
  }

  function revealSlot(index: number): void {
    if (index < 0 || index >= LOOT_REVEAL_SLOT_COUNT) return;
    if (revealed[index]) return;

    revealed[index] = true;
    const btn = slotButtons[index];
    if (!btn) return;

    btn.classList.add('loot-reveal__slot--animating');
    playRevealSound(options.onRevealSound);

    window.setTimeout(() => {
      applyRevealedVisual(btn, index);
      updateRevealAllState();
    }, REVEAL_ANIM_MS);
  }

  function revealAll(): void {
    for (let i = 0; i < LOOT_REVEAL_SLOT_COUNT; i += 1) {
      if (!revealed[i]) revealSlot(i);
    }
  }

  function updateRevealAllState(): void {
    revealAllBtn.disabled = revealed.every(Boolean);
  }

  function destroy(): void {
    root.remove();
  }

  return {
    root,
    revealSlot,
    revealAll,
    allRevealed: () => revealed.every(Boolean),
    destroy,
  };
}
