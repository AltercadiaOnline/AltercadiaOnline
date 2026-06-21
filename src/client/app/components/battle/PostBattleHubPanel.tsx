import { BattleType } from '../../../../shared/combat/battleType.js';
import { getPostBattleHudBridge } from '../../bridge/postBattleHudBridge.js';
import type { PostBattleHudSnapshot } from '../../bridge/postBattleHudBridge.js';
import {
  triggerPostBattleExit,
  triggerPostBattleRewards,
  triggerPostBattleStatistics,
  triggerPostBattleViewOpponent,
} from '../../battle/postBattleHubHandlers.js';
import {
  isPostBattlePvp,
  resolvePostBattleRankingLabel,
  resolvePostBattleRankingText,
  resolvePostBattleSubtitleText,
  resolvePostBattleTitleText,
  shouldShowPostBattleRewardsSlot,
  type PostBattleHubSummary,
} from '../../../ui/battle/postBattleHubView.js';
import { usePostBattleLootPackageWatcher } from '../../panels/usePostBattleLootWatcher.js';

type PostBattleHubPanelProps = {
  snapshot: PostBattleHudSnapshot;
};

function toSummary(snapshot: PostBattleHudSnapshot): PostBattleHubSummary | null {
  if (!snapshot.payload) return null;
  const payload = snapshot.payload;
  return {
    battleType: payload.battleType,
    victory: payload.victory,
    xpGain: payload.xpGain,
    ...(payload.endReason !== undefined ? { endReason: payload.endReason } : {}),
    ...(payload.rankingResult !== undefined ? { rankingResult: payload.rankingResult } : {}),
  };
}

export function PostBattleHubPanel({ snapshot }: PostBattleHubPanelProps) {
  const summary = toSummary(snapshot);
  usePostBattleLootPackageWatcher(snapshot.payload?.battleId, snapshot.rewardsLootStatus);

  if (!summary) return null;

  const isPvp = isPostBattlePvp(summary);
  const showRewards = shouldShowPostBattleRewardsSlot(summary);
  const lootStatus = snapshot.rewardsLootStatus;

  const rewardsDisabled =
    lootStatus === 'unavailable'
    || lootStatus === 'waiting_for_server'
    || snapshot.rewardsOpening;

  const rewardsLabel = lootStatus === 'unavailable'
    ? 'Recompensas indisponíveis'
    : lootStatus === 'waiting_for_server'
      ? 'Aguardando servidor…'
      : snapshot.rewardsOpening
        ? 'Abrindo…'
        : 'Recompensas';

  const handleRewards = () => {
    if (rewardsDisabled) return;
    getPostBattleHudBridge().setRewardsOpening(true);
    void Promise.resolve(triggerPostBattleRewards())
      .finally(() => {
        const status = getPostBattleHudBridge().snapshot().rewardsLootStatus;
        if (status !== 'waiting_for_server' && status !== 'unavailable') {
          getPostBattleHudBridge().setRewardsOpening(false);
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

        <div className="post-battle-hub__actions">
          <button
            type="button"
            className="post-battle-hub__stats"
            onClick={() => triggerPostBattleStatistics()}
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
            type="button"
            className="post-battle-hub__exit"
            disabled={snapshot.exitPending}
            onClick={() => {
              getPostBattleHudBridge().setExitPending(true);
              triggerPostBattleExit();
            }}
          >
            {snapshot.exitPending ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      </div>
    </div>
  );
}
