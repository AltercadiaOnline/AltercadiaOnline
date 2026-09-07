import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { isWorldPanelOpen } from '../../../store/worldPanelsStore.js';
import { getPlayerProfileStore } from '../../../../ui/character/playerProfileStore.js';
import { getPvpQueueStore, type PvpQueueSlot, type PvpQueueSnapshot } from '../../../panels/pvpQueueStore.js';
import {
  sendPvpRankedJoin,
  sendPvpRankedLeave,
  sendPvpRankedReady,
  sendPvpRankedSetStake,
  sendPvpRankedUnready,
} from '../../../panels/pvpRankedQueueBridge.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { postGameChatMessage } from '../../../../ui/gameChat.js';
import { resolveWorldLoreCredentials } from '../../../../services/worldLoreCredentials.js';
import {
  PVP_RANKED_ACCEPT_COUNTDOWN_MS,
  PVP_RANKED_MODE,
  PVP_RANKED_STATION_ID,
  PVP_RANKED_STATION_LABEL,
} from '../../../../../shared/combat/pvp/pvpRankedQueueConfig.js';
import {
  PVP_RANKED_STAKE_MAX_VOLTS,
  PVP_RANKED_STAKE_MIN_VOLTS,
} from '../../../../../shared/combat/pvp/pvpRankedDuelStake.js';
import { resolvePlayerSkinBundleSouthPreviewUrl } from '../../../../../shared/character/playerSkinBundle.js';
import { alertSystem } from '../../../../ui/alertSystem.js';
import { getGameStore } from '../../../../state/GameStore.js';
import { getPlayerWalletStore } from '../../../../ui/wallet/playerWalletStore.js';
import { formatVoltsShort } from '../../../../../shared/economy/premiumCurrency.js';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';

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

function resolveLocalPvpIdentity(): { playerId: string; characterId: number | null } {
  try {
    return resolveWorldLoreCredentials();
  } catch {
    const characterId = getGameStore().getActiveCharacterId();
    if (characterId !== null) return { playerId: `player:${characterId}`, characterId };
    return { playerId: 'local-player', characterId: null };
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
        {!slot ? 'Vazio' : slot.ready || slot.stakeLocked ? 'Travado' : 'Na fila'}
      </p>
      {slot ? (
        <p className="pvp-queue__fighter-stake">
          {slot.stakeVolts > 0 ? formatVoltsShort(slot.stakeVolts) : 'Sem aposta'}
        </p>
      ) : null}
    </div>
  );
}

/**
 * HUD espelho — zero aprovação. Join/ready/leave só via bridge → autoridade
 * (Railway online | LocalCombatAuthority local).
 */
export function WorldPvpQueuePanel({
  context,
  zIndex,
  focused,
}: WorldPvpQueuePanelProps) {
  const station = resolveStation(context);
  const snapshot = usePvpQueueSnapshot();
  /** Revision estável — getSnapshot() do wallet cria objeto novo e dispara React #185. */
  const walletRevision = useSyncExternalStore(
    (onChange) =>
      subscribeExternalStore(
        (listener) => getPlayerWalletStore().subscribe(() => listener()),
        onChange,
      ),
    () => {
      const s = getPlayerWalletStore().getSnapshot();
      return `${s.dollarVolt}|${s.alterCoins}`;
    },
    () => '0|0',
  );
  const walletDollarVolt = Number(walletRevision.split('|')[0] ?? 0);
  const [selectedStakeVolts, setSelectedStakeVolts] = useState(PVP_RANKED_STAKE_MIN_VOLTS);
  const identity = useMemo(() => resolveLocalPvpIdentity(), []);
  const localPlayerId = identity.playerId;
  const profile = getPlayerProfileStore().getSnapshot();
  const store = getPvpQueueStore();
  const localSlot = snapshot.slots.find((slot) => {
    if (!slot || slot.playerId !== localPlayerId) return false;
    if (identity.characterId !== null && slot.characterId !== undefined) {
      return slot.characterId === identity.characterId;
    }
    return true;
  }) ?? null;
  const leftSlot = snapshot.slots[0];
  const rightSlot = snapshot.slots[1];
  const inQueue = Boolean(localSlot);
  const countdownActive =
    snapshot.phase === 'countdown'
    || snapshot.phase === 'starting'
    || snapshot.phase === 'in_battle';
  const potVolts = snapshot.potVolts;
  const canChangeStake = inQueue && !countdownActive && !localSlot?.ready;
  /** Enquanto edita, o rascunho local manda; snapshot só após travar / countdown. */
  const displayedStake = canChangeStake
    ? selectedStakeVolts
    : (localSlot?.stakeVolts ?? selectedStakeVolts);
  const canLockStake =
    inQueue
    && !localSlot?.ready
    && !countdownActive
    && displayedStake >= PVP_RANKED_STAKE_MIN_VOLTS
    && displayedStake <= PVP_RANKED_STAKE_MAX_VOLTS
    && displayedStake <= walletDollarVolt;
  const countdownLabel =
    snapshot.countdownSecondsRemaining !== null
      ? String(snapshot.countdownSecondsRemaining)
      : String(Math.round(PVP_RANKED_ACCEPT_COUNTDOWN_MS / 1000));

  useEffect(() => {
    store.setLocalPlayerId(localPlayerId, identity.characterId ?? undefined);
    store.openStation(station.objectId, station.label);
    // Autoridade decide slots — front só pede join.
    sendPvpRankedJoin(station.objectId, profile.displayName || 'Você', 0);
    return () => {
      queueMicrotask(() => {
        if (isWorldPanelOpen('pvpQueue')) return;
        sendPvpRankedLeave(station.objectId);
      });
    };
  }, [station.objectId, station.label, localPlayerId, identity.characterId, profile.displayName, store]);

  /** Espelha rascunho inicial (≥50) no servidor assim que o slot local estiver editável. */
  useEffect(() => {
    if (!canChangeStake) return;
    if (selectedStakeVolts < PVP_RANKED_STAKE_MIN_VOLTS) return;
    if ((localSlot?.stakeVolts ?? 0) === selectedStakeVolts) return;
    sendPvpRankedSetStake(station.objectId, selectedStakeVolts);
  }, [canChangeStake, localSlot?.stakeVolts, selectedStakeVolts, station.objectId]);

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

  return (
    <MovablePanelFrame
      windowId="pvpQueue"
      title={station.label}
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--pvp-queue ui-panel--pvp-queue ui-panel--npc-hybrid ui-skin-hybrid"
      panelStyle={{ width: 'min(520px, 96vw)' }}
      onFocus={() => tryFocusReactWorldPanel('pvpQueue')}
      onClose={() => {
        sendPvpRankedLeave(station.objectId);
        tryCloseReactWorldPanel('pvpQueue');
      }}
    >
      <div className="pvp-queue">
        <p className="pvp-queue__tag">ARENA // PVP RANQUEADO · {PVP_RANKED_MODE.toUpperCase()}</p>
        <p className="pvp-queue__hint">{snapshot.statusMessage}</p>

        {countdownActive && snapshot.phase !== 'in_battle' ? (
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

        <div className="pvp-queue__stake" aria-label="Aposta em VOLTS">
          <p className="pvp-queue__stake-label">
            {potVolts > 0
              ? `Pote ${formatVoltsShort(potVolts)} (soma das apostas). Casa: 5%.`
              : 'Digite e trave sua aposta (mín. 50 V). Cada um pode apostar um valor diferente.'}
          </p>
          <label className="pvp-queue__stake-custom">
            <span className="pvp-queue__stake-custom-label">Sua aposta</span>
            <span className="pvp-queue__stake-input-wrap">
              <input
                type="number"
                inputMode="numeric"
                min={PVP_RANKED_STAKE_MIN_VOLTS}
                max={PVP_RANKED_STAKE_MAX_VOLTS}
                step={1}
                disabled={!canChangeStake}
                value={displayedStake > 0 ? displayedStake : ''}
                placeholder={String(PVP_RANKED_STAKE_MIN_VOLTS)}
                aria-label={`Aposta em VOLTS, mínimo ${PVP_RANKED_STAKE_MIN_VOLTS}`}
                onChange={(event) => {
                  const raw = event.target.value.trim();
                  if (raw === '') {
                    setSelectedStakeVolts(0);
                    return;
                  }
                  const next = Math.floor(Number(raw));
                  if (!Number.isFinite(next) || next < 0) return;
                  setSelectedStakeVolts(next);
                  if (next >= PVP_RANKED_STAKE_MIN_VOLTS && next <= PVP_RANKED_STAKE_MAX_VOLTS) {
                    sendPvpRankedSetStake(station.objectId, next);
                  }
                }}
              />
              <span className="pvp-queue__stake-unit" aria-hidden>
                V
              </span>
            </span>
          </label>
          {displayedStake > walletDollarVolt ? (
            <p className="pvp-queue__stake-warn">VOLTS insuficientes para este valor.</p>
          ) : null}
        </div>

        <div className="pvp-queue__actions">
          {inQueue && !localSlot?.ready && !countdownActive ? (
            <button
              type="button"
              className="pvp-queue__btn pvp-queue__btn--primary pvp-queue__btn--enter"
              disabled={!canLockStake}
              onClick={() => sendPvpRankedReady(station.objectId)}
            >
              Travar aposta
            </button>
          ) : null}

          {inQueue && (localSlot?.ready || countdownActive) && snapshot.phase !== 'in_battle' ? (
            <button
              type="button"
              className="pvp-queue__btn"
              onClick={() => {
                sendPvpRankedUnready(station.objectId);
                tryCloseReactWorldPanel('pvpQueue');
              }}
            >
              Cancelar
            </button>
          ) : null}

          {inQueue && !localSlot?.ready && !countdownActive ? (
            <button
              type="button"
              className="pvp-queue__btn"
              onClick={() => {
                sendPvpRankedLeave(station.objectId);
                tryCloseReactWorldPanel('pvpQueue');
              }}
            >
              Sair
            </button>
          ) : null}
        </div>
      </div>
    </MovablePanelFrame>
  );
}
