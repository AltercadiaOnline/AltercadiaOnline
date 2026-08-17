import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';
import {
  getCasualDuelHudState,
  isCasualDuelCountdownVisible,
  isCasualDuelPromptVisible,
  isCasualDuelWaitingVisible,
  subscribeCasualDuelHud,
} from '../../../../world/casualDuelStore.js';
import { dispatchDuelInviteRespond } from '../../../../world/playerInspectActions.js';
import { resolveWorldLoreCredentials } from '../../../../services/worldLoreCredentials.js';
import { UI_LAYER_Z_INDEX } from '../../../shell/uiLayers.js';
import { CasualDuelPhase } from '../../../../../shared/social/casualDuelTypes.js';

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
      return 'Convite recusado.';
    case 'range':
      return 'O convite falhou — alguém se afastou.';
    case 'timeout':
      return 'O convite expirou.';
    case 'busy':
      return 'Alguém ficou ocupado. Convite cancelado.';
    case 'offline':
      return 'Jogador indisponível. Convite cancelado.';
    case 'map':
      return 'Mapa diferente. Convite cancelado.';
    default:
      return 'Convite cancelado.';
  }
}

export function CasualDuelInviteHud() {
  const state = useSyncExternalStore(
    (onChange) => subscribeExternalStore((listener) => subscribeCasualDuelHud(listener), onChange),
    getCasualDuelHudState,
    getCasualDuelHudState,
  );
  const localPlayerId = useMemo(() => resolveLocalPlayerId(), []);
  const snapshot = state.snapshot;
  const showCountdown = isCasualDuelCountdownVisible(snapshot);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!showCountdown) return undefined;
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [showCountdown, snapshot?.countdownEndsAtMs]);

  if (!snapshot || !localPlayerId) return null;

  const showPrompt = isCasualDuelPromptVisible(localPlayerId, snapshot);
  const showWaiting = isCasualDuelWaitingVisible(localPlayerId, snapshot);
  const showCancel = snapshot.phase === CasualDuelPhase.Cancelled;
  if (!showPrompt && !showWaiting && !showCountdown && !showCancel) return null;

  const remaining = snapshot.countdownEndsAtMs
    ? Math.max(0, Math.ceil((snapshot.countdownEndsAtMs - Date.now()) / 1000))
    : 5;

  return (
    <div
      className="casual-duel-hud pointer-events-auto"
      role="alertdialog"
      aria-live="polite"
      style={{ zIndex: UI_LAYER_Z_INDEX.overlay }}
    >
      {showWaiting ? (
        <p className="casual-duel-hud__title">
          Aguardando {snapshot.toDisplayName} aceitar…
        </p>
      ) : null}

      {showPrompt ? (
        <>
          <p className="casual-duel-hud__title">
            {snapshot.fromDisplayName} te convidou para uma batalha
          </p>
          <p className="casual-duel-hud__hint">Recusar não tem penalidade.</p>
          <div className="casual-duel-hud__actions">
            <button
              type="button"
              className="casual-duel-hud__accept"
              onClick={() => dispatchDuelInviteRespond(snapshot.inviteId, true)}
            >
              Aceitar
            </button>
            <button
              type="button"
              className="casual-duel-hud__refuse"
              onClick={() => dispatchDuelInviteRespond(snapshot.inviteId, false)}
            >
              Recusar
            </button>
          </div>
        </>
      ) : null}

      {showCountdown ? (
        <p className="casual-duel-hud__title">
          Batalha em {remaining}s
        </p>
      ) : null}

      {showCancel ? (
        <p className="casual-duel-hud__title">{cancelCopy(snapshot.cancelReason)}</p>
      ) : null}
    </div>
  );
}
