import { useRef, useSyncExternalStore } from 'react';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';
import {
  closePlayerInspectHud,
  getPlayerInspectHudState,
  subscribePlayerInspectHud,
} from '../../../../world/playerInspectStore.js';
import {
  dispatchDuelInvite,
  dispatchPlayerFriendRequest,
  dispatchTradeRequest,
} from '../../../../world/playerInspectActions.js';
import { EQUIPMENT_UI_SLOT_LABELS } from '../../../../../shared/character/equipmentUiSlots.js';
import { ItemSlotIcon } from '../panels/ItemSlotIcon.js';
import { UI_LAYER_Z_INDEX } from '../../../shell/uiLayers.js';

export function PlayerInspectHud() {
  const rootRef = useRef<HTMLDivElement>(null);
  const state = useSyncExternalStore(
    (onChange) => subscribeExternalStore((listener) => subscribePlayerInspectHud(listener), onChange),
    getPlayerInspectHudState,
    getPlayerInspectHudState,
  );

  const view = state.view;
  if (!view) return null;

  return (
    <div
      ref={rootRef}
      className="player-inspect-hud pointer-events-auto"
      role="dialog"
      aria-label={`Ficha de ${view.displayName}`}
      style={{
        left: state.screenX,
        top: state.screenY,
        zIndex: UI_LAYER_Z_INDEX.overlay,
      }}
    >
      <header className="player-inspect-hud__header">
        <span className="player-inspect-hud__name">{view.displayName}</span>
        <span className="player-inspect-hud__level">Lv {view.level}</span>
        <button
          type="button"
          className="player-inspect-hud__close"
          aria-label="Fechar"
          onClick={() => closePlayerInspectHud()}
        >
          ×
        </button>
      </header>
      <p className={`player-inspect-hud__status ${view.online ? 'is-online' : 'is-offline'}`}>
        {view.online ? '● Online' : '○ Offline'}
      </p>

      <ul className="player-inspect-hud__equip" aria-label="Equipamento">
        {view.equipment.map((slot) => (
          <li
            key={slot.slotId}
            className={`player-inspect-hud__slot${slot.itemId ? '' : ' is-empty'}`}
            title={slot.itemName || EQUIPMENT_UI_SLOT_LABELS[slot.slotId]}
          >
            {slot.itemId ? (
              <ItemSlotIcon itemId={slot.itemId} className="player-inspect-hud__icon" />
            ) : (
              <span className="player-inspect-hud__slot-label">
                {EQUIPMENT_UI_SLOT_LABELS[slot.slotId]}
              </span>
            )}
          </li>
        ))}
      </ul>

      {view.canAddFriend ? (
        <button
          type="button"
          className="player-inspect-hud__action"
          disabled={state.pending}
          onClick={() => dispatchPlayerFriendRequest(view.playerId, view.characterId)}
        >
          {state.pending ? 'Adicionando…' : 'Adicione como amigo'}
        </button>
      ) : null}

      {view.canInviteDuel ? (
        <button
          type="button"
          className="player-inspect-hud__action player-inspect-hud__action--duel"
          disabled={state.pending}
          onClick={() => dispatchDuelInvite(view.playerId, view.characterId)}
        >
          {state.pending ? 'Enviando…' : 'Convidar para batalha'}
        </button>
      ) : null}

      {view.canTrade ? (
        <button
          type="button"
          className="player-inspect-hud__action player-inspect-hud__action--trade"
          disabled={state.pending}
          onClick={() => dispatchTradeRequest(view.playerId, view.characterId)}
        >
          {state.pending ? 'Enviando…' : 'Fazer trade'}
        </button>
      ) : null}

      {state.error ? <p className="player-inspect-hud__error">{state.error}</p> : null}
    </div>
  );
}
