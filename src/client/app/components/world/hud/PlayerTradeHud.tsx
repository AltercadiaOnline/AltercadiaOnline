import { useMemo, useState, useSyncExternalStore } from 'react';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';
import {
  getPlayerTradeHudState,
  isTradePromptVisible,
  isTradeTableVisible,
  isTradeWaitingVisible,
  subscribePlayerTradeHud,
} from '../../../../world/playerTradeStore.js';
import {
  dispatchTradeCancel,
  dispatchTradeLock,
  dispatchTradeOfferSet,
  dispatchTradeRespond,
} from '../../../../world/playerInspectActions.js';
import { resolveWorldLoreCredentials } from '../../../../services/worldLoreCredentials.js';
import { UI_LAYER_Z_INDEX } from '../../../shell/uiLayers.js';
import { TradePhase, type TradeItemOffer, type TradeSideSnapshot } from '../../../../../shared/social/playerTradeTypes.js';
import { getItemById } from '../../../../../shared/items/itemCatalog.js';
import { ItemSlotIcon } from '../panels/ItemSlotIcon.js';
import { getPlayerInventoryStore } from '../../../../ui/inventory/playerInventoryStore.js';
import { getPlayerWalletStore } from '../../../../ui/wallet/playerWalletStore.js';

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
    default:
      return 'Trade encerrado.';
  }
}

function catalogOffer(offer: TradeItemOffer | null): TradeItemOffer | null {
  if (!offer || !getItemById(offer.itemId)) return null;
  return offer;
}

function itemLabel(offer: TradeItemOffer | null): string {
  const catalogued = catalogOffer(offer);
  if (!catalogued) return '';
  const name = getItemById(catalogued.itemId)?.name;
  if (!name) return '';
  return `${catalogued.quantity}× ${name}`;
}

function TradeSlots(props: {
  readonly side: TradeSideSnapshot;
  readonly mine: boolean;
  readonly disabled: boolean;
  readonly onClearSlot: (slotIndex: number) => void;
}) {
  return (
    <ul className="player-trade-hud__slots" aria-label={props.mine ? 'Sua oferta' : 'Oferta do outro'}>
      {props.side.slots.map((rawSlot, index) => {
        const slot = catalogOffer(rawSlot);
        return (
          <li key={index} className={`player-trade-hud__slot${slot ? '' : ' is-empty'}`}>
            {slot ? (
              <button
                type="button"
                className="player-trade-hud__slot-btn"
                disabled={!props.mine || props.disabled}
                title={itemLabel(slot)}
                onClick={() => props.onClearSlot(index)}
              >
                <ItemSlotIcon itemId={slot.itemId} className="player-trade-hud__icon" />
                <span>{slot.quantity}</span>
              </button>
            ) : (
              <span className="player-trade-hud__slot-empty">{index + 1}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PlayerTradeHud() {
  const state = useSyncExternalStore(
    (onChange) => subscribeExternalStore((listener) => subscribePlayerTradeHud(listener), onChange),
    getPlayerTradeHudState,
    getPlayerTradeHudState,
  );
  const inventory = useSyncExternalStore(
    (onChange) => getPlayerInventoryStore().subscribe(() => onChange()),
    () => getPlayerInventoryStore().getSnapshot(),
    () => getPlayerInventoryStore().getSnapshot(),
  );
  const wallet = useSyncExternalStore(
    (onChange) => getPlayerWalletStore().subscribe(() => { onChange(); }),
    () => getPlayerWalletStore().getSnapshot(),
    () => getPlayerWalletStore().getSnapshot(),
  );
  const localPlayerId = useMemo(() => resolveLocalPlayerId(), []);
  const [voltsInput, setVoltsInput] = useState('0');
  const snapshot = state.snapshot;

  if (!snapshot || !localPlayerId) return null;

  const showPrompt = isTradePromptVisible(localPlayerId, snapshot);
  const showWaiting = isTradeWaitingVisible(localPlayerId, snapshot);
  const showTable = isTradeTableVisible(snapshot);
  const showDone = snapshot.phase === TradePhase.Cancelled || snapshot.phase === TradePhase.Committed;
  if (!showPrompt && !showWaiting && !showTable && !showDone) return null;

  const mine = snapshot.from.playerId === localPlayerId ? snapshot.from : snapshot.to;
  const theirs = snapshot.from.playerId === localPlayerId ? snapshot.to : snapshot.from;
  const busy = state.pending || snapshot.phase === TradePhase.Committing;

  const bag = inventory.slots.filter((slot) => {
    if (!slot.itemId || slot.quantity <= 0) return false;
    const available = slot.quantity - (slot.lockedQuantity ?? 0);
    return available > 0;
  });

  return (
    <div
      className="player-trade-hud pointer-events-auto"
      role="dialog"
      aria-label="Trade"
      style={{ zIndex: UI_LAYER_Z_INDEX.overlay }}
    >
      {showWaiting ? (
        <p className="player-trade-hud__title">Aguardando {snapshot.to.displayName} aceitar o trade…</p>
      ) : null}

      {showPrompt ? (
        <>
          <p className="player-trade-hud__title">{snapshot.from.displayName} quer trocar itens</p>
          <p className="player-trade-hud__hint">Recusar não tem penalidade.</p>
          <div className="player-trade-hud__actions">
            <button type="button" className="player-trade-hud__accept" onClick={() => dispatchTradeRespond(snapshot.tradeId, true)}>
              Aceitar
            </button>
            <button type="button" className="player-trade-hud__refuse" onClick={() => dispatchTradeRespond(snapshot.tradeId, false)}>
              Recusar
            </button>
          </div>
        </>
      ) : null}

      {showTable ? (
        <>
          <p className="player-trade-hud__title">
            Trade com {theirs.displayName}
          </p>
          <div className="player-trade-hud__columns">
            <section>
              <p className="player-trade-hud__col-title">Você {mine.ready ? '✓' : ''}</p>
              <TradeSlots
                side={mine}
                mine
                disabled={busy || mine.ready}
                onClearSlot={(slotIndex) => dispatchTradeOfferSet(snapshot.tradeId, { slotIndex, itemId: null, quantity: 0 })}
              />
              <p className="player-trade-hud__volts">{mine.volts} V</p>
            </section>
            <section>
              <p className="player-trade-hud__col-title">{theirs.displayName} {theirs.ready ? '✓' : ''}</p>
              <TradeSlots side={theirs} mine={false} disabled onClearSlot={() => {}} />
              <p className="player-trade-hud__volts">{theirs.volts} V</p>
            </section>
          </div>

          <div className="player-trade-hud__bag">
            {bag.slice(0, 12).map((slot, index) => {
              const available = slot.quantity - (slot.lockedQuantity ?? 0);
              const emptyIndex = mine.slots.findIndex((offer) => offer === null);
              return (
                <button
                  key={`${slot.itemId}-${index}`}
                  type="button"
                  className="player-trade-hud__bag-item"
                  disabled={busy || mine.ready || emptyIndex < 0 || !slot.itemId}
                  title={slot.itemId ? (getItemById(slot.itemId)?.name ?? slot.itemId) : ''}
                  onClick={() => {
                    if (!slot.itemId || emptyIndex < 0) return;
                    dispatchTradeOfferSet(snapshot.tradeId, {
                      slotIndex: emptyIndex,
                      itemId: slot.itemId,
                      quantity: available,
                    });
                  }}
                >
                  {slot.itemId ? <ItemSlotIcon itemId={slot.itemId} className="player-trade-hud__icon" /> : null}
                </button>
              );
            })}
          </div>

          <div className="player-trade-hud__volts-row">
            <input
              type="number"
              min={0}
              max={wallet.dollarVolt}
              value={voltsInput}
              disabled={busy || mine.ready}
              onChange={(event) => setVoltsInput(event.target.value)}
              aria-label="VOLTS a oferecer"
            />
            <button
              type="button"
              disabled={busy || mine.ready}
              onClick={() => dispatchTradeOfferSet(snapshot.tradeId, {
                volts: Math.max(0, Math.floor(Number(voltsInput) || 0)),
              })}
            >
              Oferecer V
            </button>
          </div>

          <div className="player-trade-hud__actions">
            <button
              type="button"
              className="player-trade-hud__accept"
              disabled={busy}
              onClick={() => dispatchTradeLock(snapshot.tradeId, !mine.ready)}
            >
              {mine.ready ? 'Desfazer' : 'Confirmar'}
            </button>
            <button
              type="button"
              className="player-trade-hud__refuse"
              disabled={busy}
              onClick={() => dispatchTradeCancel(snapshot.tradeId)}
            >
              Cancelar
            </button>
          </div>
          {state.error ? <p className="player-trade-hud__error">{state.error}</p> : null}
        </>
      ) : null}

      {showDone ? (
        <p className="player-trade-hud__title">
          {snapshot.phase === TradePhase.Committed ? 'Troca concluída.' : cancelCopy(snapshot.cancelReason)}
        </p>
      ) : null}
    </div>
  );
}
