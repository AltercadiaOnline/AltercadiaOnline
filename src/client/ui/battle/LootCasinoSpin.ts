import type { LootRevealSlot } from '../../../shared/loot/lootRevealSlots.js';

import { LOOT_REVEAL_SLOT_COUNT } from '../../../shared/loot/lootRevealSlots.js';

import { formatVolts } from '../../../shared/economy/premiumCurrency.js';

import {

  resolveInventoryItemAbbrev,

  resolveInventoryItemLabel,

} from '../inventory/inventoryItemDisplay.js';



export type LootCasinoSpinOptions = {

  readonly slots: readonly LootRevealSlot[];

  readonly mountRoot: HTMLElement;

  readonly onComplete?: () => void;

};



export type LootCasinoSpinController = {

  readonly root: HTMLElement;

  readonly featuredIndex: number;

  /** @deprecated Use rollSlots */

  startSpin(): Promise<void>;

  rollSlots(): Promise<void>;

  destroy(): void;

};



/** Tempo de desaceleração até travar (por rolo). */

const DECEL_MS = 750;

const DECEL_EASING = 'cubic-bezier(0.17, 0.67, 0.83, 0.67)';



/** Giro rápido mínimo antes do 1º rolo começar a parar. */

const BASE_SPIN_MS = 520;



/** Intervalo entre o início da parada de cada rolo (0 → 0.5s → 1s → 1.5s). */

const REEL_STOP_DELAY_MS = 500;



const BLUR_FACE_COUNT = 10;

const BOUNCE_MS = 220;

const BOUNCE_OVERSHOOT_PX = 8;



const SPIN_BLUR_SYMBOLS = ['?', '⚡', '—', '◆', '✦', '◎'] as const;



const TIER_RANK: Record<string, number> = {

  empty: 0,

  gold: 1,

  common: 2,

  uncommon: 3,

  rare: 4,

  epic: 5,

  legendary: 6,

};



type ReelElements = {

  readonly cell: HTMLElement;

  readonly windowEl: HTMLElement;

  readonly strip: HTMLElement;

};



function slotTierRank(slot: LootRevealSlot): number {

  if (slot.kind === 'EMPTY') return TIER_RANK.empty ?? 0;

  if (slot.kind === 'GOLD') return TIER_RANK.gold ?? 1;

  return TIER_RANK[slot.rarity ?? 'common'] ?? 2;

}



export function resolveFeaturedLootSlotIndex(slots: readonly LootRevealSlot[]): number {

  let bestIndex = 0;

  let bestRank = -1;

  for (let i = 0; i < slots.length; i += 1) {

    const rank = slotTierRank(slots[i] ?? { kind: 'EMPTY' });

    if (rank > bestRank) {

      bestRank = rank;

      bestIndex = i;

    }

  }

  return bestIndex;

}



function buildSlotFace(slot: LootRevealSlot): { html: string; classes: string[]; label: string } {

  if (slot.kind === 'EMPTY') {

    return {

      html: '<span class="loot-casino__icon loot-casino__icon--empty">—</span><span class="loot-casino__label">Vazio</span>',

      classes: ['loot-casino__cell--empty'],

      label: 'Vazio',

    };

  }

  if (slot.kind === 'GOLD') {

    const amount = slot.voltAmount ?? 0;

    return {

      html: `<span class="loot-casino__icon loot-casino__icon--gold">⚡</span><span class="loot-casino__label">${formatVolts(amount)} V</span>`,

      classes: ['loot-casino__cell--gold'],

      label: `${formatVolts(amount)} Volts`,

    };

  }

  const itemId = slot.itemId ?? 'unknown';

  const abbrev = resolveInventoryItemAbbrev(itemId);

  const name = resolveInventoryItemLabel(itemId);

  const rarity = slot.rarity ?? 'common';

  return {

    html: `<span class="loot-casino__icon loot-casino__icon--item">${abbrev}</span><span class="loot-casino__label">${name}</span>`,

    classes: ['loot-casino__cell--item', `loot-casino__cell--rarity-${rarity}`],

    label: name,

  };

}



function resolveDecelStartMs(index: number): number {

  return BASE_SPIN_MS + index * REEL_STOP_DELAY_MS;

}



function getItemHeight(windowEl: HTMLElement): number {

  return windowEl.clientHeight || 72;

}



function waitTransform(element: HTMLElement, fallbackMs: number): Promise<void> {

  return new Promise((resolve) => {

    let settled = false;

    const finish = () => {

      if (settled) return;

      settled = true;

      resolve();

    };



    element.addEventListener(

      'transitionend',

      (event) => {

        if (event.propertyName === 'transform') finish();

      },

      { once: true },

    );



    window.setTimeout(finish, fallbackMs + 80);

  });

}



function waitAnimation(element: HTMLElement, fallbackMs: number): Promise<void> {

  return new Promise((resolve) => {

    let settled = false;

    const finish = () => {

      if (settled) return;

      settled = true;

      resolve();

    };



    element.addEventListener('animationend', finish, { once: true });

    window.setTimeout(finish, fallbackMs + 80);

  });

}



function runFastSpin(

  strip: HTMLElement,

  itemHeight: number,

  durationMs: number,

  isDestroyed: () => boolean,

): Promise<void> {

  const blurDistance = BLUR_FACE_COUNT * itemHeight;



  return new Promise((resolve) => {

    const start = performance.now();

    let lastOffset = 0;



    const tick = (now: number) => {

      if (isDestroyed()) {

        resolve();

        return;

      }



      const elapsed = now - start;

      if (elapsed >= durationMs) {

        strip.style.transform = `translate3d(0, ${-lastOffset}px, 0)`;

        resolve();

        return;

      }



      const progress = elapsed / durationMs;

      const speed = 0.28 + progress * 0.62;

      const offset = (elapsed * speed * 14) % blurDistance;

      lastOffset = offset;

      strip.style.transform = `translate3d(0, ${-offset}px, 0)`;

      requestAnimationFrame(tick);

    };



    strip.style.transition = 'none';

    requestAnimationFrame(tick);

  });

}



async function decelerateToFinal(

  strip: HTMLElement,

  itemHeight: number,

): Promise<void> {

  const finalY = -(BLUR_FACE_COUNT * itemHeight);

  strip.style.setProperty('--reel-stop-y', `${finalY}px`);

  strip.style.setProperty('--reel-bounce-overshoot', `${BOUNCE_OVERSHOOT_PX}px`);

  strip.style.transition = `transform ${DECEL_MS}ms ${DECEL_EASING}`;

  strip.style.transform = `translate3d(0, ${finalY}px, 0)`;

  await waitTransform(strip, DECEL_MS);

}



async function playReelBounce(strip: HTMLElement): Promise<void> {

  strip.style.transition = 'none';

  strip.classList.add('loot-casino__strip--bounce');

  await waitAnimation(strip, BOUNCE_MS);

  strip.classList.remove('loot-casino__strip--bounce');

}



/**

 * Quatro colunas estilo slot machine — para nos prêmios autoritativos do servidor.

 */

export function mountLootCasinoSpin(options: LootCasinoSpinOptions): LootCasinoSpinController {

  const authoritative = options.slots.slice(0, LOOT_REVEAL_SLOT_COUNT);

  while (authoritative.length < LOOT_REVEAL_SLOT_COUNT) {

    authoritative.push({ kind: 'EMPTY' });

  }



  const featuredIndex = resolveFeaturedLootSlotIndex(authoritative);

  const root = document.createElement('div');

  root.className = 'loot-casino';



  const row = document.createElement('div');

  row.className = 'loot-casino__row';

  row.setAttribute('role', 'group');

  row.setAttribute('aria-label', 'Slots de recompensa');



  const reels: ReelElements[] = [];



  for (let index = 0; index < LOOT_REVEAL_SLOT_COUNT; index += 1) {

    const cell = document.createElement('div');

    cell.className = 'loot-casino__cell';

    cell.dataset.slotIndex = String(index);



    const windowEl = document.createElement('div');

    windowEl.className = 'loot-casino__window';



    const strip = document.createElement('div');

    strip.className = 'loot-casino__strip';



    for (let blurIndex = 0; blurIndex < BLUR_FACE_COUNT; blurIndex += 1) {

      const blurFace = document.createElement('div');

      blurFace.className = 'loot-casino__face loot-casino__face--blur';

      const symbol = SPIN_BLUR_SYMBOLS[blurIndex % SPIN_BLUR_SYMBOLS.length] ?? '?';

      blurFace.innerHTML = `<span class="loot-casino__blur">${symbol}</span>`;

      strip.appendChild(blurFace);

    }



    const finalFace = document.createElement('div');

    finalFace.className = 'loot-casino__face loot-casino__face--final';

    finalFace.innerHTML = '<span class="loot-casino__blur">?</span>';

    strip.appendChild(finalFace);



    windowEl.appendChild(strip);

    cell.append(windowEl);

    row.appendChild(cell);

    reels.push({ cell, windowEl, strip });

  }



  root.appendChild(row);

  options.mountRoot.appendChild(root);



  let destroyed = false;



  function destroy(): void {

    destroyed = true;

    root.remove();

  }



  async function spinCell(index: number): Promise<void> {

    const reel = reels[index];

    if (!reel) return;



    const { cell, windowEl, strip } = reel;

    cell.classList.add('loot-casino__cell--spinning');



    const decelStartMs = resolveDecelStartMs(index);

    await runFastSpin(strip, getItemHeight(windowEl), decelStartMs, () => destroyed);

    if (destroyed) return;



    const slot = authoritative[index] ?? { kind: 'EMPTY' as const };

    const { html, classes, label } = buildSlotFace(slot);

    const finalFace = strip.querySelector<HTMLElement>('.loot-casino__face--final');

    if (finalFace) finalFace.innerHTML = html;



    const itemHeight = getItemHeight(windowEl);

    void strip.offsetHeight;



    await decelerateToFinal(strip, itemHeight);

    if (destroyed) return;



    await playReelBounce(strip);

    if (destroyed) return;



    cell.classList.remove('loot-casino__cell--spinning');

    cell.classList.add('loot-casino__cell--landed', ...classes);

    if (index === featuredIndex && slot.kind !== 'EMPTY') {

      cell.classList.add('loot-casino__cell--featured');

    }

    cell.setAttribute('aria-label', `Slot ${index + 1}: ${label}`);

  }



  async function rollSlots(): Promise<void> {

    if (destroyed) return;



    await Promise.all(

      Array.from({ length: LOOT_REVEAL_SLOT_COUNT }, (_, index) => spinCell(index)),

    );

    if (!destroyed) {

      options.onComplete?.();

    }

  }



  const startSpin = rollSlots;



  return {

    root,

    featuredIndex,

    startSpin,

    rollSlots,

    destroy,

  };

}


