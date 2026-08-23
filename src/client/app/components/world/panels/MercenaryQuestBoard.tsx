import { useMemo } from 'react';
import {
  useAbandonMercenaryQuest,
  useAcceptMercenaryQuest,
  useCompleteMercenaryQuest,
  useMercenaryQuestBoard,
} from '../../../panels/useMercenaryQuestBoard.js';
import {
  getMercenaryQuestBand,
  MERCENARY_QUEST_BANDS,
  MERCENARY_QUEST_COUNT,
} from '../../../../../shared/quests/mercenaryQuestCatalog.js';
import type {
  MercenaryQuestBand,
  MercenaryQuestBoardRow,
} from '../../../../../shared/quests/mercenaryQuestTypes.js';

type MercenaryQuestBoardProps = {
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

function MercenaryQuestTrackerCard({ quest }: { readonly quest: MercenaryQuestBoardRow }) {
  const abandon = useAbandonMercenaryQuest(quest.id);

  return (
    <article className="mercenary-tracker">
      <div className="mercenary-tracker__head">
        <span className="mercenary-tracker__status">ATIVO</span>
        <span className="mercenary-tracker__band">Nv. {quest.minLevel}–{quest.maxLevel}</span>
      </div>
      <h3 className="mercenary-tracker__title">{quest.title}</h3>
      <dl className="mercenary-tracker__fields">
        <div className="mercenary-tracker__field">
          <dt>Contratante</dt>
          <dd>{quest.npcGiver}</dd>
        </div>
        <div className="mercenary-tracker__field">
          <dt>Objetivo</dt>
          <dd>{quest.interaction}</dd>
        </div>
        <div className="mercenary-tracker__field">
          <dt>Recompensa</dt>
          <dd>{formatQuestRewards(quest)}</dd>
        </div>
      </dl>
      <details className="mercenary-tracker__context">
        <summary>Contexto narrativo</summary>
        <p>{quest.lore}</p>
      </details>
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
  compact,
  slotBusy,
}: {
  readonly quest: MercenaryQuestBoardRow;
  readonly compact: boolean;
  readonly slotBusy: boolean;
}) {
  const accept = useAcceptMercenaryQuest(quest);
  const abandon = useAbandonMercenaryQuest(quest.id);
  const complete = useCompleteMercenaryQuest(quest.id);
  const acceptDisabled = quest.status !== 'available' || accept.pending || slotBusy;

  return (
    <article className={`mercenary-board__row mercenary-board__row--${quest.status}`}>
      <header className="mercenary-board__row-head">
        <p className="mercenary-board__title">{quest.title}</p>
        <span className="mercenary-board__band">Nv. {quest.minLevel}–{quest.maxLevel}</span>
      </header>
      {compact ? (
        <p className="mercenary-board__lore">{quest.loreSummary}</p>
      ) : (
        <>
          <p className="mercenary-board__giver">{quest.npcGiver}</p>
          <p className="mercenary-board__lore">{quest.lore}</p>
          <p className="mercenary-board__interaction">{quest.interaction}</p>
          <p className="mercenary-board__meta">
            {formatQuestRewards(quest)}
            {quest.moralChoice ? ' · Escolha moral (flavor)' : ''}
          </p>
        </>
      )}
      {quest.status === 'active' ? (
        <p className="mercenary-board__placeholder">
          Pronto para entregar — Completar paga {formatQuestRewards(quest)}.
        </p>
      ) : null}
      <div className="mercenary-board__actions">
        {quest.status === 'active' ? (
          <>
            <button
              type="button"
              className="mercenary-board__btn"
              disabled={complete.pending || abandon.pending}
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
            onClick={accept.submit}
          >
            {accept.buttonLabel}
          </button>
        )}
      </div>
    </article>
  );
}

/** Hub Social → Contratos: só o ativo. Compacto (mercenário): ofertas da faixa de nível. */
export function MercenaryQuestBoard({ compact = false }: MercenaryQuestBoardProps) {
  const { level, progress, rows, activeQuest } = useMercenaryQuestBoard();
  const agentBand = useMemo(() => resolveBandForLevel(level), [level]);
  const activeRow = useMemo((): MercenaryQuestBoardRow | null => {
    const fromBoard = rows.find((quest) => quest.status === 'active');
    if (fromBoard) return fromBoard;
    if (!activeQuest) return null;
    return { ...activeQuest, status: 'active' };
  }, [rows, activeQuest]);
  const groups = useMemo(() => {
    const byTier = new Map<MercenaryQuestBoardRow['tier'], MercenaryQuestBoardRow[]>();
    for (const quest of rows) {
      const list = byTier.get(quest.tier) ?? [];
      list.push(quest);
      byTier.set(quest.tier, list);
    }
    return [...byTier.entries()].map(([tier, quests]) => ({
      band: getMercenaryQuestBand(tier),
      quests,
    }));
  }, [rows]);

  /** Ativo fora da faixa atual (ex.: upou) — ainda precisa Completar no NPC. */
  const orphanActive = useMemo((): MercenaryQuestBoardRow | null => {
    if (!activeQuest) return null;
    if (rows.some((row) => row.id === activeQuest.id)) return null;
    return { ...activeQuest, status: 'active' };
  }, [activeQuest, rows]);

  if (!compact) {
    return (
      <section className="mercenary-board mercenary-board--tracker" aria-label="Contrato ativo">
        <p className="mercenary-board__tag">NODE::BOUNTY · AGENTE NV. {level}</p>
        {activeRow ? (
          <MercenaryQuestTrackerCard quest={activeRow} />
        ) : (
          <div className="mercenary-tracker mercenary-tracker--idle">
            <p className="mercenary-tracker__idle-title">AGUARDANDO CONTRATO.</p>
            <p className="mercenary-tracker__hint">
              Assine no NPC Mercenário. 1 ativo por vez.
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
    <div className="mercenary-board mercenary-board--compact">
      <p className="mercenary-board__tag">NODE::BOUNTY · AGENTE NV. {level}</p>
      {activeQuest ? (
        <p className="mercenary-board__active">
          Ativo: {activeQuest.title}
          <span className="mercenary-board__placeholder"> · Entregue aqui com Completar</span>
        </p>
      ) : (
        <p className="mercenary-board__active mercenary-board__active--idle">
          Nenhum contrato assinado. Escolha um da sua faixa.
        </p>
      )}
      {orphanActive ? (
        <div className="mercenary-board__list">
          <section className="mercenary-board__group">
            <p className="mercenary-board__band-title">Contrato ativo (fora da faixa atual)</p>
            <MercenaryQuestRow quest={orphanActive} compact slotBusy={false} />
          </section>
        </div>
      ) : null}
      {groups.length === 0 && !orphanActive ? (
        <p className="mercenary-board__empty">Nenhum contrato nesta faixa de nível.</p>
      ) : (
        <div className="mercenary-board__list">
          {groups.map(({ band, quests }) => (
            <section key={band.tier} className="mercenary-board__group">
              <p className="mercenary-board__band-title">
                {band.title}
                <span> · Nv. {band.minLevel}–{band.maxLevel}</span>
              </p>
              {quests.map((quest) => (
                <MercenaryQuestRow
                  key={quest.id}
                  quest={quest}
                  compact
                  slotBusy={Boolean(activeQuest) && quest.status === 'available'}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
