// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useTournamentBetPanel } from '../../panels/useTournamentBetPanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function TournamentBetPanelHud({ focused }) {
    const { context, bodyHtml, handleClick, handleInput } = useTournamentBetPanel(true);
    const header = (<header className="ui-panel__header tournament-bet__header" data-panel-drag-handle>
      <div className="tournament-bet__header-main">
        <span className="tournament-bet__tag">ARENA // TORNEIO</span>
        <h2 className="ui-panel__title tournament-bet__title">{context.pulpitName}</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar torneio" onClick={() => closeHudWindow('tournamentBet')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="tournamentBet" className="ui-panel--tournament-bet" title={context.pulpitName} focused={focused} customHeader={header} bodyClassName="ui-panel__body tournament-bet__body">
      <div onClick={handleClick} onInput={handleInput}>
        <HtmlInject html={bodyHtml}/>
      </div>
    </MovablePanelShell>);
}
