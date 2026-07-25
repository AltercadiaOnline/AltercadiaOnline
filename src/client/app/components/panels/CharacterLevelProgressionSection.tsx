// @ts-nocheck
import { useEffect, useRef } from 'react';
import { formatLevelWithClass } from '../../../../shared/character/combatClassDisplay.js';
import { resolveCharacterLevelXpBar, } from '../../../../shared/character/characterLevelProgression.js';
import { buildPlayerLevelProgressionTooltip } from '../../../../shared/progression/progressionTooltipContent.js';
import { patchProgressionTooltipAttrs } from '../../../ui/tooltip/progressionTooltipAttrs.js';
import { formatWorldExplorationMoveSpeedDisplay, resolveWorldExplorationMoveSpeed, } from '../../../../shared/world/worldExplorationMoveSpeed.js';
import { resolveLoadoutPpBudget } from '../../../../shared/combat/loadoutPpBudget.js';
import { getGlobalPlayerStore } from '../../../ui/moveset/globalPlayerStore.js';
import { VELOCIDADE_STAT_DESCRIPTION, VELOCIDADE_STAT_LABEL, } from '../../../../shared/stats/statDisplayLabels.js';
export function CharacterLevelProgressionSection({ model, }) {
    const sectionRef = useRef(null);
    const bar = resolveCharacterLevelXpBar(model.profile.level, model.profile.xpCurrent);
    const moveSpeed = resolveWorldExplorationMoveSpeed(model.speedBonusTotal, model.isEncumbered);
    const moveSpeedText = formatWorldExplorationMoveSpeedDisplay(moveSpeed);
    const { ppCurrent, ppMax } = resolveLoadoutPpBudget(getGlobalPlayerStore().getConfirmedLoadout());
    const ppText = ppMax > 0 ? `${ppCurrent} / ${ppMax}` : '—';
    useEffect(() => {
        const section = sectionRef.current;
        if (!section)
            return;
        const barEl = section.querySelector('.character-xp-bar');
        if (barEl) {
            patchProgressionTooltipAttrs(barEl, buildPlayerLevelProgressionTooltip(model.profile, bar));
        }
    }, [bar, model.profile]);
    return (<section ref={sectionRef} className="character-stats-block" aria-label="Progressão de Nível" data-level-progression-section>
      <header className="character-stats-block__header">
        <h3 className="character-stats-block__title">Progressão de Nível</h3>
      </header>
      <p className="character-stats-block__level" data-char-level>
        {formatLevelWithClass(model.profile.level, model.classId)}
      </p>
      <div className="character-xp-bar" role="progressbar" aria-valuenow={bar.xpCurrent} aria-valuemax={bar.xpToNext} aria-label="Experiência">
        <div className="character-xp-bar__fill" data-xp-fill style={{ width: `${bar.percent}%` }}/>
      </div>
      <p className="character-xp-text" data-xp-text>
        {bar.xpCurrent}
        {' / '}
        {bar.xpToNext}
        {' XP'}
      </p>
      <ul className="character-level-progression-list" data-level-progression-vitals aria-label="Status do personagem no mundo">
        <li className="character-level-progression-row" data-level-vital="hp">
          <div className="character-level-progression-row__head">
            <span className="character-level-progression-row__label">HP</span>
            <strong className="character-level-progression-row__value" title="Pontos de vida">
              {model.vitals.hpCurrent}
              {' / '}
              {model.vitals.hpMax}
            </strong>
          </div>
        </li>
        <li className="character-level-progression-row" data-level-vital="pp">
          <div className="character-level-progression-row__head">
            <span className="character-level-progression-row__label">PP</span>
            <strong className="character-level-progression-row__value" title="Pontos de poder (soma do loadout de 4 moves)">
              {ppText}
            </strong>
          </div>
        </li>
        <li className="character-level-progression-row" data-level-vital="move-speed">
          <div className="character-level-progression-row__head">
            <span className="character-level-progression-row__label">{VELOCIDADE_STAT_LABEL}</span>
            <strong className="character-level-progression-row__value" title={`${VELOCIDADE_STAT_DESCRIPTION} Valor exibido: deslocamento no mapa (px/s).`}>
              {moveSpeedText}
            </strong>
          </div>
        </li>
      </ul>
    </section>);
}
