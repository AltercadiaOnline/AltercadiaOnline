/**
 * Trade presencial no DOM do jogo (dist/client) — Aceitar + mesa 1×1.
 * Mesmo padrão do duelo casual: não depende do bundle React app-ui.
 */

import { getItemById } from '../../shared/items/itemCatalog.js';
import {
  TradePhase,
  type TradeItemOffer,
  type TradeSideSnapshot,
  type TradeSnapshot,
} from '../../shared/social/playerTradeTypes.js';
import { resolveItemIconSrc } from '../ui/items/itemIconDisplay.js';
import { getPlayerInventoryStore } from '../ui/inventory/playerInventoryStore.js';
import { resolveWorldLoreCredentials } from '../services/worldLoreCredentials.js';
import {
  dispatchTradeCancel,
  dispatchTradeLock,
  dispatchTradeOfferSet,
  dispatchTradeRespond,
} from './playerInspectActions.js';
import {
  getPlayerTradeHudState,
  isTradePromptVisible,
  isTradeTableVisible,
  isTradeWaitingVisible,
  subscribePlayerTradeHud,
} from './playerTradeStore.js';

const ROOT_ID = 'player-trade-hud-dom';
const OVERLAY_Z = 10_000;

let bound = false;
let inventoryUnsub: (() => void) | null = null;

/** Prompt Aceitar + mesa 1×1 no DOM do jogo — store aplicado por `gameSession`. */
export function bindPlayerTradeDomHud(): void {
  if (bound || typeof document === 'undefined') return;
  bound = true;
  subscribePlayerTradeHud(syncPlayerTradeDomHud);
  inventoryUnsub = getPlayerInventoryStore().subscribe(() => {
    const snap = getPlayerTradeHudState().snapshot;
    if (snap && isTradeTableVisible(snap)) syncPlayerTradeDomHud();
  });
  syncPlayerTradeDomHud();
}

function resolveLocalPlayerId(): string | null {
  try {
    return resolveWorldLoreCredentials().playerId;
  } catch {
    return null;
  }
}

function cancelCopy(reason: string | null): string {
  switch (reason) {
    case 'refused':
      return 'Trade recusado.';
    case 'range':
      return 'Trade cancelado — alguém se afastou.';
    case 'timeout':
      return 'O pedido de trade expirou.';
    case 'busy':
      return 'Alguém ficou ocupado. Trade cancelado.';
    case 'offline':
      return 'Jogador indisponível. Trade cancelado.';
    case 'map':
      return 'Mapa diferente. Trade cancelado.';
    case 'combat':
      return 'Combate iniciou. Trade cancelado.';
    case 'cancelled':
      return 'Trade cancelado.';
    case 'capacity':
      return 'Inventário sem espaço. Trade cancelado.';
    default:
      return 'Trade encerrado.';
  }
}

function catalogOffer(offer: TradeItemOffer | null): TradeItemOffer | null {
  if (!offer || !getItemById(offer.itemId)) return null;
  return offer;
}

function offerLabel(offer: TradeItemOffer | null): string {
  const row = catalogOffer(offer);
  if (!row) return 'vazio';
  const name = getItemById(row.itemId)?.name ?? row.itemId;
  return `${row.quantity}× ${name}`;
}

function offerIconHtml(offer: TradeItemOffer | null): string {
  const row = catalogOffer(offer);
  if (!row) return '<span class="player-trade-hud__slot-empty">—</span>';
  const src = resolveItemIconSrc(row.itemId);
  return `<img class="player-trade-hud__icon" src="${escapeAttr(src)}" alt="" draggable="false" /><span>${row.quantity}</span>`;
}

function sideForLocal(snapshot: TradeSnapshot, localPlayerId: string): {
  readonly mine: TradeSideSnapshot;
  readonly theirs: TradeSideSnapshot;
} {
  if (snapshot.from.playerId === localPlayerId) {
    return { mine: snapshot.from, theirs: snapshot.to };
  }
  return { mine: snapshot.to, theirs: snapshot.from };
}

function bagButtonsHtml(disabled: boolean): string {
  const inventory = getPlayerInventoryStore().getSnapshot();
  const bag = inventory.slots.filter((slot) => {
    if (!slot.itemId || slot.quantity <= 0) return false;
    const available = slot.quantity - (slot.lockedQuantity ?? 0);
    return available > 0;
  });
  if (bag.length === 0) {
    return '<p class="player-trade-hud__hint">Inventário vazio.</p>';
  }
  return bag
    .slice(0, 16)
    .map((slot, index) => {
      const available = slot.quantity - (slot.lockedQuantity ?? 0);
      const itemId = slot.itemId!;
      const name = getItemById(itemId)?.name ?? itemId;
      const src = resolveItemIconSrc(itemId);
      return `<button type="button" class="player-trade-hud__bag-item" data-trade-act="offer" data-item-id="${escapeAttr(itemId)}" data-qty="${available}" ${disabled ? 'disabled' : ''} title="${escapeAttr(`${name} (ofertar 1)`)}"><img class="player-trade-hud__icon" src="${escapeAttr(src)}" alt="" draggable="false" /></button>`;
    })
    .join('');
}

function syncPlayerTradeDomHud(): void {
  const state = getPlayerTradeHudState();
  const snapshot = state.snapshot;
  const existing = document.getElementById(ROOT_ID);
  const localPlayerId = resolveLocalPlayerId();

  if (!snapshot || !localPlayerId) {
    existing?.remove();
    return;
  }

  const showPrompt = isTradePromptVisible(localPlayerId, snapshot);
  const showWaiting = isTradeWaitingVisible(localPlayerId, snapshot);
  const showTable = isTradeTableVisible(snapshot);
  const showDone =
    snapshot.phase === TradePhase.Cancelled || snapshot.phase === TradePhase.Committed;
  if (!showPrompt && !showWaiting && !showTable && !showDone) {
    existing?.remove();
    return;
  }

  const root = existing ?? document.createElement('div');
  if (!existing) {
    root.id = ROOT_ID;
    root.className = 'player-trade-hud hud-overlay-card ui-skin-hybrid pointer-events-auto';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Trade');
    root.style.zIndex = String(OVERLAY_Z);
    document.body.appendChild(root);
    root.addEventListener('click', onRootClick);
  }

  const busy = state.pending || snapshot.phase === TradePhase.Committing;
  const parts: string[] = [];

  if (showWaiting) {
    parts.push(`
      <p class="player-trade-hud__title">Aguardando ${escapeHtml(snapshot.to.displayName)} aceitar o trade…</p>
      <div class="player-trade-hud__actions">
        <button type="button" class="player-trade-hud__refuse" data-trade-act="cancel">Cancelar</button>
      </div>`);
  }

  if (showPrompt) {
    parts.push(`
      <p class="player-trade-hud__title">${escapeHtml(snapshot.from.displayName)} quer trocar itens</p>
      <p class="player-trade-hud__hint">Recusar não tem penalidade. Troca 1×1.</p>
      <div class="player-trade-hud__actions">
        <button type="button" class="player-trade-hud__accept" data-trade-act="accept">Aceitar</button>
        <button type="button" class="player-trade-hud__refuse" data-trade-act="refuse">Recusar</button>
      </div>`);
  }

  if (showTable) {
    const { mine, theirs } = sideForLocal(snapshot, localPlayerId);
    const mineOffer = catalogOffer(mine.slots[0] ?? null);
    const theirsOffer = catalogOffer(theirs.slots[0] ?? null);
    const offerDisabled = busy || mine.ready;
    parts.push(`
      <p class="player-trade-hud__title">Trade com ${escapeHtml(theirs.displayName)}</p>
      <p class="player-trade-hud__hint">1 item de cada lado. Clique no inventário para ofertar.</p>
      <div class="player-trade-hud__columns player-trade-hud__columns--1x1">
        <section>
          <p class="player-trade-hud__col-title">Você ${mine.ready ? '✓' : ''}</p>
          <div class="player-trade-hud__slot${mineOffer ? '' : ' is-empty'}">
            <button type="button" class="player-trade-hud__slot-btn" data-trade-act="clear-slot" ${offerDisabled || !mineOffer ? 'disabled' : ''} title="${escapeAttr(offerLabel(mineOffer))}">
              ${offerIconHtml(mineOffer)}
            </button>
          </div>
        </section>
        <section>
          <p class="player-trade-hud__col-title">${escapeHtml(theirs.displayName)} ${theirs.ready ? '✓' : ''}</p>
          <div class="player-trade-hud__slot${theirsOffer ? '' : ' is-empty'}">
            <span class="player-trade-hud__slot-btn" title="${escapeAttr(offerLabel(theirsOffer))}">
              ${offerIconHtml(theirsOffer)}
            </span>
          </div>
        </section>
      </div>
      <div class="player-trade-hud__bag" aria-label="Seu inventário">${bagButtonsHtml(offerDisabled)}</div>
      <div class="player-trade-hud__actions">
        <button type="button" class="player-trade-hud__accept" data-trade-act="lock" ${busy ? 'disabled' : ''}>${mine.ready ? 'Desfazer' : 'Confirmar'}</button>
        <button type="button" class="player-trade-hud__refuse" data-trade-act="cancel" ${busy ? 'disabled' : ''}>Cancelar</button>
      </div>
      ${state.error ? `<p class="player-trade-hud__error">${escapeHtml(state.error)}</p>` : ''}`);
  }

  if (showDone) {
    parts.push(`
      <p class="player-trade-hud__title">${
        snapshot.phase === TradePhase.Committed
          ? 'Troca concluída.'
          : escapeHtml(cancelCopy(snapshot.cancelReason))
      }</p>`);
  }

  root.innerHTML = parts.join('');
  root.dataset.tradeId = snapshot.tradeId;
}

function onRootClick(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLElement>('[data-trade-act]');
  if (!button || button.hasAttribute('disabled')) return;
  const root = document.getElementById(ROOT_ID);
  const tradeId = root?.dataset.tradeId;
  if (!tradeId) return;
  const act = button.getAttribute('data-trade-act');
  const state = getPlayerTradeHudState();
  const snapshot = state.snapshot;
  if (!snapshot || snapshot.tradeId !== tradeId) return;

  if (act === 'accept') {
    dispatchTradeRespond(tradeId, true);
    return;
  }
  if (act === 'refuse') {
    dispatchTradeRespond(tradeId, false);
    return;
  }
  if (act === 'cancel') {
    dispatchTradeCancel(tradeId);
    return;
  }
  if (act === 'lock') {
    const localPlayerId = resolveLocalPlayerId();
    if (!localPlayerId) return;
    const { mine } = sideForLocal(snapshot, localPlayerId);
    dispatchTradeLock(tradeId, !mine.ready);
    return;
  }
  if (act === 'clear-slot') {
    dispatchTradeOfferSet(tradeId, { slotIndex: 0, itemId: null, quantity: 0 });
    return;
  }
  if (act === 'offer') {
    const itemId = button.getAttribute('data-item-id');
    if (!itemId) return;
    // 1×1: ofertar 1 unidade do item escolhido.
    dispatchTradeOfferSet(tradeId, { slotIndex: 0, itemId, quantity: 1 });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

/** Testes / teardown — evita bind duplicado em HMR. */
export function resetPlayerTradeDomHudForTests(): void {
  inventoryUnsub?.();
  inventoryUnsub = null;
  bound = false;
  document.getElementById(ROOT_ID)?.remove();
}
