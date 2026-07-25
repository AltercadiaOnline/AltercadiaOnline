// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useRankingMonitorPanel } from '../../panels/useRankingMonitorPanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function RankingMonitorPanelHud({ focused }) {
    const { context, bodyHtml, handleClick } = useRankingMonitorPanel(true);
    const header = (<header className="ui-panel__header ranking-monitor__header" data-panel-drag-handle>
      <div className="ranking-monitor__header-main">
        <span className="ranking-monitor__tag">ARENA // RANKING</span>
        <h2 className="ui-panel__title ranking-monitor__title">{context.label}</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar ranking" onClick={() => closeHudWindow('rankingMonitor')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="rankingMonitor" className="ui-panel--ranking-monitor" title={context.label} focused={focused} customHeader={header} bodyClassName="ui-panel__body ranking-monitor__body" dynamicLayoutOptions={{
            fitRootSelector: '[data-hud-fit-root]',
            itemSelector: '[data-hud-fit-item]',
            secondarySelector: '[data-hud-fit-secondary]',
            minVisibleItems: 3,
        }}>
      <div data-hud-fit-root onClick={handleClick}>
        <HtmlInject html={bodyHtml}/>
      </div>
    </MovablePanelShell>);
}
