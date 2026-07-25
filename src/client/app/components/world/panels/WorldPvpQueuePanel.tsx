import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { isWorldPanelOpen } from '../../../store/worldPanelsStore.js';
import { getPlayerProfileStore } from '../../../../ui/character/playerProfileStore.js';
import { getPvpQueueStore, type PvpQueueSlot, type PvpQueueSnapshot } from '../../../panels/pvpQueueStore.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { postGameChatMessage } from '../../../../ui/gameChat.js';
import { resolveWorldLoreCredentials } from '../../../../services/worldLoreCredentials.js';
import {
  PVP_RANKED_ACCEPT_COUNTDOWN_MS,
  PVP_RANKED_MODE,
  PVP_RANKED_STATION_ID,
  PVP_RANKED_STATION_LABEL,
} from '../../../../../shared/combat/pvp/pvpRankedQueueConfig.js';
import { getActivePlayerSkinBundleId } from '../../../../entities/player/activePlayerSkinBundle.js';
import { resolvePlayerSkinBundleSouthPreviewUrl } from '../../../../../shared/character/playerSkinBundle.js';
import { alertSystem } from '../../../../ui/alertSystem.js';
import { getGameStore } from '../../../../state/GameStore.js';

type WorldPvpQueuePanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

function resolveStation(context: WorldPanelContext): { objectId: string; label: string } {
  if (context.kind === 'pvpQueue') {
    return { objectId: context.objectId, label: context.label };
  }
  return { objectId: PVP_RANKED_STATION_ID, label: PVP_RANKED_STATION_LABEL };
}

/** Nunca lança no render — evita derrubar o WorldSceneShell inteiro. */
function resolveLocalPvpPlayerId(): string {
  try {
    return resolveWorldLoreCredentials().playerId;
  } catch {
    const characterId = getGameStore().getActiveCharacterId();
    if (characterId !== null) return `player:${characterId}`;
    return 'local-player';
  }
}

function usePvpQueueSnapshot(): PvpQueueSnapshot {
  const store = getPvpQueueStore();
  return useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  );
}

function PvpFighterCard({
  slot,
  side,
}: {
  slot: PvpQueueSlot | null;
  side: 'left' | 'right';
}) {
  const previewUrl = slot
    ? resolvePlayerSkinBundleSouthPreviewUrl(slot.skinBundleId)
    : null;

  return (
    <div className={`pvp-queue__fighter pvp-queue__fighter--${side}${slot ? ' is-filled' : ''}${slot?.ready ? ' is-ready' : ''}`}>
      <div className="pvp-queue__fighter-frame">
        {previewUrl ? (
          <img
            className="pvp-queue__fighter-skin"
            src={previewUrl}
            alt=""
            draggable={false}
          />
        ) : (
          <div className="pvp-queue__fighter-empty" aria-hidden>
            ?
          </div>
        )}
      </div>
      <p className="pvp-queue__fighter-name">
        {slot?.displayName ?? (side === 'left' ? 'Você' : 'Aguardando…')}
      </p>
      <p className="pvp-queue__fighter-state">
        {!slot ? 'Vazio' : slot.ready ? 'Pronto' : 'Na fila'}
      </p>
    </div>
  );
}

export function WorldPvpQueuePanel({
  context,
  zIndex,
  focused,
}: WorldPvpQueuePanelProps) {
  const station = resolveStation(context);
  const snapshot = usePvpQueueSnapshot();
  const localPlayerId = useMemo(() => resolveLocalPvpPlayerId(), []);
  const profile = getPlayerProfileStore().getSnapshot();
  const store = getPvpQueueStore();
  const localSlot = snapshot.slots.find((slot) => slot?.playerId === localPlayerId) ?? null;
  const inQueue = Boolean(localSlot);
  const countdownActive = snapshot.phase === 'countdown' || snapshot.phase === 'starting';
  const countdownLabel =
    snapshot.countdownSecondsRemaining !== null
      ? String(snapshot.countdownSecondsRemaining)
      : String(Math.round(PVP_RANKED_ACCEPT_COUNTDOWN_MS / 1000));

  useEffect(() => {
    store.openStation(station.objectId, station.label);
    store.ensureLocalPresent(
      localPlayerId,
      profile.displayName || 'Você',
      getActivePlayerSkinBundleId(),
    );
    return () => {
      // Strict Mode remount: painel ainda aberto → não cancela a sessão.
      queueMicrotask(() => {
        if (isWorldPanelOpen('pvpQueue')) return;
        store.leaveLocal(localPlayerId);
      });
    };
  }, [station.objectId, station.label, localPlayerId, profile.displayName, store]);

  useEffect(() => {
    return store.onSessionCancelled(() => {
      tryCloseReactWorldPanel('pvpQueue');
    });
  }, [store]);

  useEffect(() => {
    return store.onRankedMatchStart((match) => {
      postGameChatMessage(
        `PvP rankeado ${PVP_RANKED_MODE}: ${match.slots[0]?.displayName ?? '?'} vs ${match.slots[1]?.displayName ?? '?'} — entrando na batalha…`,
      );
      alertSystem('Entrando na batalha rankeada…');
      tryCloseReactWorldPanel('pvpQueue');
    });
  }, [store]);

  const leftSlot = snapshot.slots[0];
  const rightSlot = snapshot.slots[1];

  return (
    <MovablePanelFrame
      windowId="pvpQueue"
      title={station.label}
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--pvp-queue ui-panel--pvp-queue"
      panelStyle={{ width: 'min(520px, 96vw)' }}
      onFocus={() => tryFocusReactWorldPanel('pvpQueue')}
      onClose={() => {
        store.leaveLocal(localPlayerId);
        tryCloseReactWorldPanel('pvpQueue');
      }}
    >
      <div className="pvp-queue">
        <p className="pvp-queue__tag">ARENA // PVP RANQUEADO · {PVP_RANKED_MODE.toUpperCase()}</p>
        <p className="pvp-queue__hint">{snapshot.statusMessage}</p>

        {countdownActive ? (
          <div className="pvp-queue__countdown pvp-queue__countdown--hero" aria-live="polite">
            <span className="pvp-queue__countdown-label">Batalha em</span>
            <span className="pvp-queue__countdown-value">{countdownLabel}</span>
          </div>
        ) : null}

        <div className="pvp-queue__duel" aria-label="Confrontação 1x1">
          <PvpFighterCard slot={leftSlot} side="left" />
          <div className="pvp-queue__vs" aria-hidden>
            VS
          </div>
          <PvpFighterCard slot={rightSlot} side="right" />
        </div>

        <div className="pvp-queue__actions">
          {inQueue && !localSlot?.ready && !countdownActive ? (
            <button
              type="button"
              className="pvp-queue__btn pvp-queue__btn--primary pvp-queue__btn--enter"
              disabled={!snapshot.slots[0] || !snapshot.slots[1]}
              onClick={() => store.requestEnterRanked(localPlayerId)}
            >
              Entrar na batalha rankeada
            </button>
          ) : null}

          {inQueue && localSlot?.ready && snapshot.phase === 'waiting' ? (
            <button
              type="button"
              className="pvp-queue__btn"
              onClick={() => store.cancelEnterRanked(localPlayerId)}
            >
              Cancelar aceite
            </button>
          ) : null}

          {inQueue && !countdownActive ? (
            <button
              type="button"
              className="pvp-queue__btn"
              onClick={() => {
                store.leaveLocal(localPlayerId);
                tryCloseReactWorldPanel('pvpQueue');
              }}
            >
              Sair
            </button>
          ) : null}

          {!snapshot.slots[1] && !countdownActive ? (
            <button
              type="button"
              className="pvp-queue__btn pvp-queue__btn--ghost"
              onClick={() => store.fillOpponentStub('Oponente')}
            >
              [Dev] Simular oponente
            </button>
          ) : snapshot.slots[1] && !snapshot.slots[1].isLocal && !snapshot.slots[1].ready && !countdownActive ? (
            <button
              type="button"
              className="pvp-queue__btn pvp-queue__btn--ghost"
              onClick={() => store.setOpponentReady(true)}
            >
              [Dev] Oponente entra
            </button>
          ) : null}
        </div>
      </div>
    </MovablePanelFrame>
  );
}
