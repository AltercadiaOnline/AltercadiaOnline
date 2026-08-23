import { useEffect, useState, type ReactElement } from 'react';
import { CREATURE_ENCOUNTER_IDLE_TIMEOUT_MS } from '../../../../shared/world/creatureWanderConfig.js';
import {
  getPveEncounterStore,
  type PveEncounterSnapshot,
} from '../../panels/pveEncounterStore.js';
import {
  sendPveEncounterAccept,
  sendPveEncounterFlee,
} from '../../panels/pveEncounterBridge.js';
import {
  beginPendingPveCombatJoin,
  abortCombatJoinOnError,
} from '../../../game/GameStateProvider.js';

function usePveEncounterSnapshot(): PveEncounterSnapshot {
  const store = getPveEncounterStore();
  const [snapshot, setSnapshot] = useState(store.getSnapshot());

  useEffect(() => store.subscribe(setSnapshot), [store]);
  return snapshot;
}

function useOfferCountdown(offeredAtMs: number | null): number | null {
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    if (offeredAtMs === null) {
      setRemainingSec(null);
      return undefined;
    }

    const tick = (): void => {
      const leftMs = CREATURE_ENCOUNTER_IDLE_TIMEOUT_MS - (Date.now() - offeredAtMs);
      setRemainingSec(Math.max(0, Math.ceil(leftMs / 1000)));
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [offeredAtMs]);

  return remainingSec;
}

/**
 * HUD de encontro PVE — Aceitar batalha / Tentar fugir (50% no servidor).
 * Sem clique até o timeout → fecha e o próximo encontro força combate.
 */
export function WorldPveEncounterHud(): ReactElement | null {
  const { offer, busy, lastFleeMessage } = usePveEncounterSnapshot();
  const remainingSec = useOfferCountdown(offer?.offeredAtMs ?? null);

  useEffect(() => {
    if (!lastFleeMessage) return undefined;
    const id = window.setTimeout(() => {
      getPveEncounterStore().clearFleeToast(lastFleeMessage);
    }, 3_500);
    return () => window.clearTimeout(id);
  }, [lastFleeMessage]);

  if (!offer) {
    if (!lastFleeMessage) return null;
    return (
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-[40] w-[min(345px,92%)] -translate-x-1/2 -translate-y-1/2"
        data-ui-surface="pve-encounter-toast"
      >
        <div className="pve-encounter-hud pve-encounter-hud--toast hud-overlay-card ui-skin-hybrid">
          {lastFleeMessage}
        </div>
      </div>
    );
  }

  const onAccept = (): void => {
    if (busy) return;
    getPveEncounterStore().setBusy(true);
    if (!beginPendingPveCombatJoin(offer.monsterInstanceId)) {
      getPveEncounterStore().setBusy(false);
      console.warn('[PVE] Aceite bloqueado — provider/encontro indisponível.', offer.monsterInstanceId);
      getPveEncounterStore().showTransientToast(
        'Não foi possível iniciar o combate — aproxime-se e tente de novo.',
      );
      return;
    }
    if (!sendPveEncounterAccept(offer.monsterInstanceId)) {
      getPveEncounterStore().setBusy(false);
      void abortCombatJoinOnError('INVALID_MESSAGE');
    }
  };

  const onFlee = (): void => {
    if (busy) return;
    getPveEncounterStore().setBusy(true);
    if (!sendPveEncounterFlee(offer.monsterInstanceId)) {
      getPveEncounterStore().setBusy(false);
    }
  };

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-1/2 z-[40] w-[min(368px,94%)] -translate-x-1/2 -translate-y-1/2"
      data-ui-surface="pve-encounter-hud"
      role="dialog"
      aria-label={`Encontro com ${offer.name}`}
    >
      <div className="pve-encounter-hud hud-overlay-card ui-skin-hybrid">
        <p className="pve-encounter-hud__kicker">Criatura selvagem</p>
        <p className="pve-encounter-hud__title">{offer.name}</p>
        <p className="pve-encounter-hud__hint">
          Aceitar a batalha ou tentar fugir (50% de chance).
        </p>
        {remainingSec !== null ? (
          <p className="pve-encounter-hud__hint">
            Sem decisão: {remainingSec}s — próximo encontro será obrigatório
          </p>
        ) : null}
        <div className="pve-encounter-hud__actions">
          <button
            type="button"
            className="pve-encounter-hud__accept"
            disabled={busy}
            aria-busy={busy}
            onClick={onAccept}
          >
            {busy ? 'Aguardando…' : 'Aceitar batalha'}
          </button>
          <button
            type="button"
            className="pve-encounter-hud__refuse"
            disabled={busy}
            aria-busy={busy}
            onClick={onFlee}
          >
            Tentar fugir
          </button>
        </div>
      </div>
    </div>
  );
}
