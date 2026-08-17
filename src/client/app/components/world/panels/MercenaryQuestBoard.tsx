import { useMemo } from 'react';
import {
  useAbandonMercenaryQuest,
  useAcceptMercenaryQuest,
  useMercenaryQuestBoard,
} from '../../../panels/useMercenaryQuestBoard.js';
import { getMercenaryQuestBand } from '../../../../../shared/quests/mercenaryQuestCatalog.js';
import type { MercenaryQuestBoardRow } from '../../../../../shared/quests/mercenaryQuestTypes.js';

type MercenaryQuestBoardProps = {
  readonly compact?: boolean;
};

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
  const disabled = quest.status !== 'available' || accept.pending || slotBusy;

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
            XP {quest.rewardExp} · Rep {quest.rewardBonds.reputation}
            {quest.moralChoice ? ' · Escolha moral' : ''}
          </p>
        </>
      )}
      <div className="mercenary-board__actions">
        {quest.status === 'active' ? (
          <button
            type="button"
            className="mercenary-board__btn mercenary-board__btn--ghost"
            disabled={abandon.pending}
            aria-busy={abandon.pending || undefined}
            onClick={abandon.submit}
          >
            {abandon.buttonLabel}
          </button>
        ) : (
          <button
            type="button"
            className="mercenary-board__btn"
            disabled={disabled}
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

/** Quadro de Agente — lista filtrada pelo nível autoritativo do personagem. */
export function MercenaryQuestBoard({ compact = false }: MercenaryQuestBoardProps) {
  const { level, rows, activeQuest } = useMercenaryQuestBoard();
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

  return (
    <div className={`mercenary-board${compact ? ' mercenary-board--compact' : ''}`}>
      <p className="mercenary-board__tag">NODE::BOUNTY · AGENTE NV. {level}</p>
      {activeQuest ? (
        <p className="mercenary-board__active">Ativo: {activeQuest.title}</p>
      ) : (
        <p className="mercenary-board__active mercenary-board__active--idle">Nenhum contrato assinado.</p>
      )}
      {groups.length === 0 ? (
        <p className="mercenary-board__empty">Nenhum contrato nesta faixa de nível.</p>
      ) : (
        <div className="mercenary-board__list">
          {groups.map(({ band, quests }) => (
            <section key={band.tier} className="mercenary-board__group">
              <p className="mercenary-board__band-title">
                {band.title}
                <span> · Nv. {band.minLevel}–{band.maxLevel}</span>
              </p>
              {!compact ? <p className="mercenary-board__band-brief">{band.brief}</p> : null}
              {quests.map((quest) => (
                <MercenaryQuestRow
                  key={quest.id}
                  quest={quest}
                  compact={compact}
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
