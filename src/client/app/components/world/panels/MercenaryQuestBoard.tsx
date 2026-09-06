import { useEffect, useMemo, useState } from 'react';
import {
  useAbandonMercenaryQuest,
  useAcceptMercenaryQuest,
  useCompleteMercenaryQuest,
  useMercenaryQuestBoard,
} from '../../../panels/useMercenaryQuestBoard.js';
import {
  buildMercenaryQuestBoard,
  getMercenaryQuestBand,
  isMercenaryTierComplete,
  MERCENARY_QUEST_BANDS,
  MERCENARY_QUEST_COUNT,
  resolveDefaultMercenaryViewTier,
  resolveHighestUnlockedMercenaryTier,
} from '../../../../../shared/quests/mercenaryQuestCatalog.js';
import type {
  MercenaryQuestBand,
  MercenaryQuestBoardRow,
  MercenaryQuestTier,
} from '../../../../../shared/quests/mercenaryQuestTypes.js';

type MercenaryQuestBoardProps = {
  /**
   * `false` (default) = Hub Contratos — só tracker do ativo.
   * `true` = NPC Mercenário aba Contratos — lista + Aceitar/Completar.
   */
  readonly compact?: boolean;
};

function resolveBandForLevel(level: number): MercenaryQuestBand {
  const lv = Math.max(1, Math.floor(level));
  return (
    MERCENARY_QUEST_BANDS.find((band) => lv >= band.minLevel && lv <= band.maxLevel)
    ?? MERCENARY_QUEST_BANDS[MERCENARY_QUEST_BANDS.length - 1]!
  );
}

function formatQuestRewards(quest: MercenaryQuestBoardRow): string {
  return `XP ${quest.rewardExp} · ${quest.rewardVolts} VOLTS`;
}

function acceptDisabledReason(
  quest: MercenaryQuestBoardRow,
  slotBusy: boolean,
): string | null {
  if (quest.status === 'locked') return 'Complete o tier anterior para liberar.';
  if (quest.status === 'completed') return 'Contrato já encerrado.';
  if (quest.status === 'active') return 'Já está ativo.';
  if (slotBusy) return 'Abandone o contrato ativo antes de assinar outro.';
  return null;
}

function MercenaryQuestTrackerCard({
  quest,
  trackerObjective,
  readyToTurnIn,
}: {
  readonly quest: MercenaryQuestBoardRow;
  readonly trackerObjective: string | null;
  readonly readyToTurnIn: boolean;
}) {
  const abandon = useAbandonMercenaryQuest(quest.id);

  return (
    <article className="mercenary-tracker">
      <div className="mercenary-tracker__head">
        <span className="mercenary-tracker__status">ATIVO</span>
        <span className="mercenary-tracker__band">Nv. {quest.minLevel}–{quest.maxLevel}</span>
      </div>
      <h3 className="mercenary-tracker__title">{quest.title}</h3>
      <p className="mercenary-board__lore">{quest.loreSummary}</p>
      <dl className="mercenary-tracker__fields">
        <div className="mercenary-tracker__field">
          <dt>Fazer</dt>
          <dd>{trackerObjective ?? quest.interaction}</dd>
        </div>
        {readyToTurnIn ? (
          <div className="mercenary-tracker__field">
            <dt>Status</dt>
            <dd>Pronto — entregue na aba Contratos do Mercenário.</dd>
          </div>
        ) : null}
        <div className="mercenary-tracker__field">
          <dt>Recompensa</dt>
          <dd>{formatQuestRewards(quest)}</dd>
        </div>
      </dl>
      <div className="mercenary-tracker__actions">
        <button
          type="button"
          className="mercenary-board__btn mercenary-board__btn--ghost"
          disabled={abandon.pending}
          aria-busy={abandon.pending || undefined}
          onClick={abandon.submit}
        >
          {abandon.buttonLabel}
        </button>
      </div>
    </article>
  );
}

function MercenaryQuestRow({
  quest,
  slotBusy,
  readyToTurnIn,
}: {
  readonly quest: MercenaryQuestBoardRow;
  readonly slotBusy: boolean;
  readonly readyToTurnIn: boolean;
}) {
  const accept = useAcceptMercenaryQuest(quest);
  const abandon = useAbandonMercenaryQuest(quest.id);
  const complete = useCompleteMercenaryQuest(quest.id, readyToTurnIn && quest.status === 'active');
  const blockReason = acceptDisabledReason(quest, slotBusy);
  const acceptDisabled = Boolean(blockReason) || accept.pending;

  const buttonLabel = quest.status === 'locked'
    ? 'Bloqueado'
    : quest.status === 'completed'
      ? 'Encerrado'
      : accept.buttonLabel;

  return (
    <article className={`mercenary-board__row mercenary-board__row--${quest.status}`}>
      <header className="mercenary-board__row-head">
        <p className="mercenary-board__title">{quest.title}</p>
        <span className="mercenary-board__band">Nv. {quest.minLevel}–{quest.maxLevel}</span>
      </header>
      <p className="mercenary-board__lore">{quest.loreSummary}</p>
      <p className="mercenary-board__interaction">{quest.interaction}</p>
      <p className="mercenary-board__meta">{formatQuestRewards(quest)}</p>
      {quest.status === 'active' ? (
        <p className="mercenary-board__placeholder">
          {readyToTurnIn
            ? `Pronto para entregar — Completar paga ${formatQuestRewards(quest)}.`
            : 'Conclua os objetivos no mundo antes de entregar.'}
        </p>
      ) : null}
      {quest.status === 'locked' ? (
        <p className="mercenary-board__placeholder">Complete as 5 missões do tier anterior.</p>
      ) : null}
      <div className="mercenary-board__actions">
        {quest.status === 'active' ? (
          <>
            <button
              type="button"
              className="mercenary-board__btn"
              disabled={!complete.canSubmit || complete.pending || abandon.pending}
              aria-busy={complete.pending || undefined}
              onClick={complete.submit}
            >
              {complete.buttonLabel}
            </button>
            <button
              type="button"
              className="mercenary-board__btn mercenary-board__btn--ghost"
              disabled={abandon.pending || complete.pending}
              aria-busy={abandon.pending || undefined}
              onClick={abandon.submit}
            >
              {abandon.buttonLabel}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="mercenary-board__btn"
            disabled={acceptDisabled}
            aria-busy={accept.pending || undefined}
            title={blockReason ?? undefined}
            onClick={accept.submit}
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </article>
  );
}

/** Hub Social → Contratos: só o ativo. Compacto (mercenário): quadro Aceitar/Completar. */
export function MercenaryQuestBoard({ compact = false }: MercenaryQuestBoardProps) {
  const { level, progress, activeQuest, trackerObjective, readyToTurnIn } = useMercenaryQuestBoard();
  const agentBand = useMemo(() => resolveBandForLevel(level), [level]);
  const unlockedTier = useMemo(
    () => resolveHighestUnlockedMercenaryTier(progress),
    [progress],
  );
  const defaultViewTier = useMemo(
    () => resolveDefaultMercenaryViewTier(progress),
    [progress],
  );
  const [viewedTier, setViewedTier] = useState<MercenaryQuestTier>(defaultViewTier);

  useEffect(() => {
    setViewedTier((current) => {
      if (current > unlockedTier) return unlockedTier;
      if (current < defaultViewTier && defaultViewTier <= unlockedTier) {
        return defaultViewTier;
      }
      return current;
    });
  }, [defaultViewTier, unlockedTier]);

  const activeRow = useMemo((): MercenaryQuestBoardRow | null => {
    if (!activeQuest) return null;
    return { ...activeQuest, status: 'active' };
  }, [activeQuest]);

  const tierRows = useMemo(
    () => buildMercenaryQuestBoard(progress, { tier: viewedTier }),
    [progress, viewedTier],
  );
  const viewedBand = useMemo(() => getMercenaryQuestBand(viewedTier), [viewedTier]);
  const tierComplete = useMemo(
    () => isMercenaryTierComplete(viewedTier, progress),
    [viewedTier, progress],
  );
  const nextTier = (viewedTier + 1) as MercenaryQuestTier;
  const canAdvanceTier = tierComplete
    && nextTier <= 3
    && nextTier <= unlockedTier;

  const orphanActive = useMemo((): MercenaryQuestBoardRow | null => {
    if (!activeQuest) return null;
    if (activeQuest.tier === viewedTier) return null;
    return { ...activeQuest, status: 'active' };
  }, [activeQuest, viewedTier]);

  if (!compact) {
    return (
      <section className="mercenary-board mercenary-board--tracker" aria-label="Contrato ativo">
        <p className="mercenary-board__tag">CONTRATOS · TRACKER · NV. {level}</p>
        {activeRow ? (
          <MercenaryQuestTrackerCard
            quest={activeRow}
            trackerObjective={trackerObjective}
            readyToTurnIn={readyToTurnIn}
          />
        ) : (
          <div className="mercenary-tracker mercenary-tracker--idle">
            <p className="mercenary-tracker__idle-title">NENHUM CONTRATO ATIVO</p>
            <p className="mercenary-tracker__hint">
              Assine no NPC Mercenário → aba Contratos. Aqui só acompanha o ativo.
            </p>
            <p className="mercenary-tracker__band-line">
              {agentBand.title}
              <span> · Nv. {agentBand.minLevel}–{agentBand.maxLevel}</span>
            </p>
            <p className="mercenary-tracker__meta">
              Encerrados: {progress.completedQuestIds.length} / {MERCENARY_QUEST_COUNT}
            </p>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="mercenary-board mercenary-board--compact mercenary-board--npc-contracts">
      <p className="mercenary-board__tag">
        QUADRO DE AGENTE · TIER {viewedTier} · NV. {level}
      </p>
      {activeQuest ? (
        <p className="mercenary-board__active">
          Ativo: {activeQuest.title}
          <span className="mercenary-board__placeholder"> · Entregue aqui com Completar</span>
        </p>
      ) : (
        <p className="mercenary-board__active mercenary-board__active--idle">
          Nenhum contrato assinado. Escolha um das 5 do tier e clique Aceitar.
        </p>
      )}
      {orphanActive ? (
        <div className="mercenary-board__orphan">
          <p className="mercenary-board__band-title">Contrato ativo (outro tier)</p>
          <MercenaryQuestRow
            quest={orphanActive}
            slotBusy={false}
            readyToTurnIn={readyToTurnIn}
          />
        </div>
      ) : null}
      <section className="mercenary-board__group" aria-label={viewedBand.title}>
        <p className="mercenary-board__band-title">
          {viewedBand.title}
          <span>
            {' '}
            · {tierRows.filter((row) => row.status === 'completed').length}/{tierRows.length}
          </span>
        </p>
        <p className="mercenary-board__band-brief">{viewedBand.brief}</p>
        <div className="mercenary-board__grid">
          {tierRows.map((quest) => (
            <MercenaryQuestRow
              key={quest.id}
              quest={quest}
              slotBusy={Boolean(activeQuest) && quest.status === 'available'}
              readyToTurnIn={quest.status === 'active' && readyToTurnIn}
            />
          ))}
        </div>
      </section>
      <div className="mercenary-board__tier-nav">
        {viewedTier > 1 ? (
          <button
            type="button"
            className="mercenary-board__btn mercenary-board__btn--ghost"
            onClick={() => setViewedTier((viewedTier - 1) as MercenaryQuestTier)}
          >
            Tier {viewedTier - 1}
          </button>
        ) : (
          <span />
        )}
        {canAdvanceTier ? (
          <button
            type="button"
            className="mercenary-board__btn"
            onClick={() => setViewedTier(nextTier)}
          >
            Ir para TIER {nextTier}
          </button>
        ) : viewedTier >= 3 && tierComplete ? (
          <p className="mercenary-board__tier-hint">Todos os tiers liberados neste piloto.</p>
        ) : (
          <p className="mercenary-board__tier-hint">
            Conclua as 5 missões deste tier para liberar o próximo.
          </p>
        )}
      </div>
    </div>
  );
}
