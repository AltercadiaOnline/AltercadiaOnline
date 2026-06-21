import { useEffect, useMemo } from 'react';
import {
  ARENA_TOURNAMENT_MIN_BET_VOLTS,
  describeArenaTournamentRules,
  validateArenaTournamentBet,
} from '../../../../../shared/arena/arenaTournamentBetService.js';
import { formatVoltsShort } from '../../../../../shared/economy/premiumCurrency.js';
import { endWorldHudInteractionSession } from '../../../../world/worldHudInteractionSession.js';
import { alertSystem } from '../../../../ui/alertSystem.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import {
  resolveTournamentBetFromContext,
  useTournamentBetPanelState,
} from '../../../panels/useTournamentBetPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldTournamentBetPanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

export function WorldTournamentBetPanel({
  context,
  zIndex,
  focused,
}: WorldTournamentBetPanelProps) {
  const pulpit = useMemo(() => resolveTournamentBetFromContext(context), [context]);
  const state = useTournamentBetPanelState(pulpit);
  const rules = useMemo(() => describeArenaTournamentRules(), []);

  useEffect(() => () => {
    const snapshot = endWorldHudInteractionSession();
    if (snapshot) {
      uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
    }
  }, []);

  const handleConfirm = () => {
    const validation = validateArenaTournamentBet({
      betVolts: state.betVolts,
      walletVolts: state.gold.dollarVolt,
    });

    if (!validation.ok) {
      alertSystem(validation.reason);
      return;
    }

    state.confirmInterest(validation.betVolts);
    alertSystem(
      `Aposta de ${formatVoltsShort(validation.betVolts)} registrada. Aguardando adversários no torneio.`,
    );
  };

  return (
    <MovablePanelFrame
      windowId="tournamentBet"
      title={pulpit.pulpitName}
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--tournament-bet ui-panel--tournament-bet"
      panelStyle={{ width: 'min(480px, 96vw)' }}
      onFocus={() => tryFocusReactWorldPanel('tournamentBet')}
      onClose={() => tryCloseReactWorldPanel('tournamentBet')}
    >
      <div className="tournament-bet">
        <p className="tournament-bet__tag">ARENA // TORNEIO</p>
        <p className="tournament-bet__balance">
          Saldo: <strong>{state.gold.voltsFormatted}</strong>
        </p>
        <p className="tournament-bet__hint">
          Você está no palco — outros jogadores veem que você está configurando uma aposta.
        </p>

        <section className="tournament-bet__rules" aria-label="Regras">
          <h3 className="tournament-bet__section-title">Regras</h3>
          <ul className="tournament-bet__rules-list">
            {rules.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="tournament-bet__form" aria-label="Configurar aposta">
          <h3 className="tournament-bet__section-title">Valor da aposta</h3>
          <div className="tournament-bet__presets">
            {state.presets.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`tournament-bet__preset${state.betVolts === preset ? ' is-active' : ''}`}
                onClick={() => state.setBetFromPreset(preset)}
              >
                {formatVoltsShort(preset)}
              </button>
            ))}
          </div>
          <label className="tournament-bet__input-wrap">
            <span>Aposta (Volts)</span>
            <input
              type="number"
              min={ARENA_TOURNAMENT_MIN_BET_VOLTS}
              max={state.maxBet}
              step={10}
              className="tournament-bet__input"
              value={state.betVolts}
              onChange={(event) => state.setBetFromInput(Number(event.target.value) || 0)}
            />
          </label>
        </section>

        <div className="tournament-bet__actions">
          <button
            type="button"
            className="tournament-bet__confirm"
            onClick={handleConfirm}
          >
            Confirmar interesse no torneio
          </button>
          {state.awaitingMatch ? (
            <p className="tournament-bet__status">Aguardando pareamento…</p>
          ) : null}
        </div>
      </div>
    </MovablePanelFrame>
  );
}
