import { useEffect, useMemo, useRef } from 'react';
import { REFRACTION_BOOTH_CONFIG } from '../../../../../shared/cityMinigames/refractionBoothConfig.js';
import { formatVolts } from '../../../../../shared/economy/premiumCurrency.js';
import { endWorldHudInteractionSession } from '../../../../world/worldHudInteractionSession.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { consumeReactRefractionNpcStart } from '../../../panels/refractionBoothBridge.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import {
  formatRefractionDuration,
  resolveRefractionBoothFromContext,
  useRefractionBoothPanelState,
} from '../../../panels/useRefractionBoothPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldRefractionBoothPanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

function LeaderboardBlock({
  leaderboard,
}: {
  leaderboard: readonly { readonly displayName: string; readonly score: number }[];
}) {
  if (leaderboard.length === 0) {
    return (
      <p className="refraction-booth__footnote">
        Placar vazio — seja o primeiro.
      </p>
    );
  }

  return (
    <section className="refraction-booth__board" aria-label="Top 10 do estande">
      <div className="refraction-booth__table-head">
        <span>#</span><span>Operative</span><span>Score</span>
      </div>
      <div className="refraction-booth__rows">
        {leaderboard.map((entry, index) => (
          <div key={`${entry.displayName}-${index}`} className="refraction-booth__row">
            <span className="refraction-booth__rank">{index + 1}</span>
            <span className="refraction-booth__name">{entry.displayName}</span>
            <span className="refraction-booth__score">{entry.score}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function WorldRefractionBoothPanel({
  context,
  zIndex,
  focused,
}: WorldRefractionBoothPanelProps) {
  const booth = useMemo(() => resolveRefractionBoothFromContext(context), [context]);
  const state = useRefractionBoothPanelState(booth);
  const arenaHostRef = useRef<HTMLDivElement>(null);
  const bootedRef = useRef(false);

  useEffect(() => () => {
    const snapshot = endWorldHudInteractionSession();
    if (snapshot) {
      uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
    }
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    if (consumeReactRefractionNpcStart()) {
      state.startFromNpc();
    } else {
      state.openIdle();
    }
  }, [state.openIdle, state.startFromNpc]);

  useEffect(() => {
    if (state.phase !== 'playing') return;
    state.mountArena(arenaHostRef.current);
  }, [state.phase, state.mountArena, state]);

  const entryCost = state.quote?.entryCostVolts ?? REFRACTION_BOOTH_CONFIG.entryCostVolts;
  const cooldownMs = state.quote?.cooldownRemainingMs ?? 0;
  const canAfford = state.quote?.canAfford ?? true;
  const dailyRemaining = state.quote?.dailyPrizeRemainingVolts
    ?? REFRACTION_BOOTH_CONFIG.maxDailyPrizeVolts;
  const cooldownLabel = cooldownMs > 0
    ? formatRefractionDuration(cooldownMs)
    : 'Pronto';
  const startDisabled = state.quoteLoading || cooldownMs > 0 || !canAfford || state.completing;
  const missLimit = REFRACTION_BOOTH_CONFIG.maxMisses;
  const missDanger = state.misses >= missLimit - 3;

  return (
    <MovablePanelFrame
      windowId="refractionBooth"
      title={
        state.phase === 'playing'
          ? formatRefractionDuration(state.remainingMs)
          : state.phase === 'result' && state.lastResult
            ? `Score ${state.lastResult.score}`
            : booth.label
      }
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--refraction-booth ui-panel--refraction-booth"
      panelStyle={{ width: 'min(520px, 96vw)' }}
      onFocus={() => tryFocusReactWorldPanel('refractionBooth')}
      onClose={() => tryCloseReactWorldPanel('refractionBooth')}
      hideCloseButton={state.phase === 'playing'}
    >
      {state.startPending ? (
        <div className="refraction-booth">
          <p className="refraction-booth__tag">CIDADE 01 // REFRAÇÃO</p>
          <p className="refraction-booth__intro">
            Debitando {formatVolts(entryCost)} e preparando o simulador…
          </p>
        </div>
      ) : state.phase === 'playing' ? (
        <div className="refraction-booth refraction-booth__body--playing">
          <p className="refraction-booth__tag">
            {state.failedEarly ? 'LIMITE DE QUEDAS' : 'SIMULADOR ATIVO'}
          </p>
          <div className="refraction-booth__hud">
            <span>Hits: {state.hits}</span>
            <span className={`refraction-booth__hud-misses${missDanger ? ' refraction-booth__hud-misses--danger' : ''}`}>
              Caídos: {state.misses}/{missLimit}
            </span>
            <span>Score: {state.score}</span>
          </div>
          <div ref={arenaHostRef} className="refraction-booth__arena" />
          <p className="refraction-booth__hint">Patos cruzam a tela — clique para derrubar.</p>
        </div>
      ) : state.phase === 'result' && state.lastResult ? (
        <div className="refraction-booth">
          <p className="refraction-booth__tag">SESSÃO ENCERRADA</p>
          {state.failedEarly ? (
            <p className="refraction-booth__footnote refraction-booth__footnote--fail">
              Limite de quedas atingido — simulador encerrado.
            </p>
          ) : null}
          <dl className="refraction-booth__stats refraction-booth__stats--result">
            <div><dt>Hits</dt><dd>{state.lastResult.hits}</dd></div>
            <div><dt>Caídos</dt><dd>{state.lastResult.misses}</dd></div>
            <div><dt>Prêmio</dt><dd>{formatVolts(state.lastResult.prizeVolts)}</dd></div>
            <div>
              <dt>Prêmio hoje</dt>
              <dd>
                {formatVolts(state.lastResult.dailyPrizeTotalVolts)}
                {' / '}
                {formatVolts(REFRACTION_BOOTH_CONFIG.maxDailyPrizeVolts)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="refraction-booth__start"
            onClick={state.backToIdle}
          >
            Voltar
          </button>
          <LeaderboardBlock leaderboard={state.leaderboard} />
        </div>
      ) : (
        <div className="refraction-booth">
          <p className="refraction-booth__tag">CIDADE 01 // REFRAÇÃO</p>
          <p className="refraction-booth__intro">
            Patos cruzam o simulador em curvas — acerte o máximo antes do tempo ou de 15 escapadas.
          </p>
          <dl className="refraction-booth__stats">
            <div><dt>Entrada</dt><dd>{formatVolts(entryCost)}</dd></div>
            <div><dt>Cooldown</dt><dd>{cooldownLabel}</dd></div>
            <div><dt>Prêmio hoje</dt><dd>{formatVolts(dailyRemaining)} restantes</dd></div>
          </dl>
          <button
            type="button"
            className="refraction-booth__start"
            disabled={startDisabled}
            onClick={state.startFromPanel}
          >
            {state.quoteLoading ? 'Consultando…' : 'Iniciar simulador'}
          </button>
          <LeaderboardBlock leaderboard={state.leaderboard} />
        </div>
      )}
    </MovablePanelFrame>
  );
}
