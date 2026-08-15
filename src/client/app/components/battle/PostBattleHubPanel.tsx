import { useEffect, useRef } from 'react';
import { BattleType } from '../../../../shared/combat/battleType.js';
import type { PostBattleHubSummary } from '../../../../shared/types/postBattleHub.js';
import {
  buildPostBattleHubSummary,
  isPostBattlePvp,
  resolvePostBattleRankingLabel,
  resolvePostBattleRankingText,
  resolvePostBattleSubtitleText,
  resolvePostBattleTitleText,
  shouldShowPostBattleDeathPenalty,
  shouldShowPostBattleRewardsSlot,
} from '../../../../shared/postBattle/postBattleHubPresentation.js';
import { getPostBattleHudBridge } from '../../bridge/postBattleHudBridge.js';
import type { PostBattleHudSnapshot } from '../../bridge/postBattleHudBridge.js';
import {
  hasPostBattleHubHandlers,
  triggerPostBattleExit,
  triggerPostBattleRewards,
  triggerPostBattleStatistics,
  triggerPostBattleViewOpponent,
} from '../../battle/postBattleHubHandlers.js';
import { usePostBattleLootPackageWatcher } from '../../panels/usePostBattleLootWatcher.js';
import { postSystemNotification } from '../../../ui/logService.js';

type PostBattleHubPanelProps = {
  snapshot: PostBattleHudSnapshot;
};

function toSummary(snapshot: PostBattleHudSnapshot): PostBattleHubSummary | null {
  if (!snapshot.payload) return null;
  const payload = snapshot.payload;
  return buildPostBattleHubSummary({
    battleType: payload.battleType,
    victory: payload.victory,
    xpGain: payload.xpGain,
    ...(payload.endReason !== undefined ? { endReason: payload.endReason } : {}),
    ...(payload.rankingResult !== undefined ? { rankingResult: payload.rankingResult } : {}),
    ...(payload.deathPenaltyOutcome !== undefined
      ? { deathPenaltyOutcome: payload.deathPenaltyOutcome }
      : {}),
  });
}

export function PostBattleHubPanel({ snapshot }: PostBattleHubPanelProps) {
  const exitRef = useRef<HTMLButtonElement>(null);
  const summary = toSummary(snapshot);

  usePostBattleLootPackageWatcher(snapshot.payload?.battleId, snapshot.rewardsLootStatus);

  useEffect(() => {
    if (summary) {
      exitRef.current?.focus();
    }
  }, [summary?.battleType, summary?.victory]);

  if (!summary) return null;

  const isPvp = isPostBattlePvp(summary);
  const showRewards = shouldShowPostBattleRewardsSlot(summary);
  const lootStatus = snapshot.rewardsLootStatus;

  // Vitória PVE: botão sempre clicável (cassino abre mesmo vazio / com retry).
  // Só trava enquanto a abertura está em andamento.
  const rewardsDisabled = snapshot.rewardsOpening;

  const rewardsLabel = snapshot.rewardsOpening
    ? 'Abrindo…'
    : lootStatus === 'waiting_for_server'
      ? 'Aguardando servidor…'
      : 'Recompensas';

  const handleRewards = () => {
    if (rewardsDisabled) return;
    if (!hasPostBattleHubHandlers()) {
      postSystemNotification('Hub de batalha sem ligação — recarregue e tente de novo.', 'high');
      return;
    }
    getPostBattleHudBridge().setRewardsOpening(true);
    void triggerPostBattleRewards().finally(() => {
      getPostBattleHudBridge().setRewardsOpening(false);
    });
  };

  const handleExit = () => {
    if (snapshot.exitPending) return;
    if (!hasPostBattleHubHandlers()) {
      postSystemNotification('Não foi possível sair — hub sem ligação. Recarregue a página.', 'high');
      return;
    }
    getPostBattleHudBridge().setExitPending(true);
    void triggerPostBattleExit().finally(() => {
      // Sucesso dismissa o hub; falha mantém ativo → libera o botão.
      if (getPostBattleHudBridge().snapshot().active) {
        getPostBattleHudBridge().setExitPending(false);
      }
    });
  };

  return (
    <div
      className={[
        'post-battle-hub',
        'post-battle-hub--force-viewport',
        `post-battle-hub--${summary.battleType.toLowerCase()}`,
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label={isPvp ? 'Menu pós-duelo' : 'Menu pós-batalha'}
      data-battle-type={summary.battleType}
    >
      <div className="post-battle-hub__panel">
        <h2 className="post-battle-hub__title">{resolvePostBattleTitleText(summary)}</h2>
        <p className="post-battle-hub__subtitle">{resolvePostBattleSubtitleText(summary)}</p>

        {shouldShowPostBattleDeathPenalty(summary) ? (
          <ul className="post-battle-hub__penalty" aria-label="Perdas da derrota">
            {(summary.deathPenaltyLines ?? []).map((line) => (
              <li key={line} className="post-battle-hub__penalty-line">
                {line}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="post-battle-hub__actions">
          <button
            type="button"
            className="post-battle-hub__stats"
            onClick={() => {
              if (!hasPostBattleHubHandlers()) {
                postSystemNotification('Estatísticas indisponíveis — hub sem ligação.', 'normal');
                return;
              }
              triggerPostBattleStatistics();
            }}
          >
            Estatísticas
          </button>

          {isPvp ? (
            <>
              {summary.battleType === BattleType.PVP ? (
                <button
                  type="button"
                  className="post-battle-hub__opponent"
                  onClick={() => triggerPostBattleViewOpponent()}
                >
                  Ver Oponente
                </button>
              ) : null}
              <div className="post-battle-hub__ranking">
                <span className="post-battle-hub__ranking-label">
                  {resolvePostBattleRankingLabel(summary)}
                </span>
                <strong className="post-battle-hub__ranking-value">
                  {resolvePostBattleRankingText(summary)}
                </strong>
              </div>
            </>
          ) : null}

          {showRewards ? (
            <button
              type="button"
              className={[
                'post-battle-hub__rewards',
                lootStatus === 'waiting_for_server' ? 'post-battle-hub__rewards--waiting' : '',
              ].filter(Boolean).join(' ')}
              disabled={rewardsDisabled}
              aria-busy={lootStatus === 'waiting_for_server' || snapshot.rewardsOpening}
              onClick={handleRewards}
            >
              {lootStatus === 'waiting_for_server' ? (
                <span className="post-battle-hub__rewards-spinner" aria-hidden="true" />
              ) : null}
              {rewardsLabel}
            </button>
          ) : null}

          <button
            ref={exitRef}
            type="button"
            className="post-battle-hub__exit"
            disabled={snapshot.exitPending}
            onClick={handleExit}
          >
            {snapshot.exitPending ? 'Saindo…' : 'Saída'}
          </button>
        </div>
      </div>
    </div>
  );
}
