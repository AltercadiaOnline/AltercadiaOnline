// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useDiaryPanel } from '../../panels/useDiaryPanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function DiaryPanelHud({ focused }) {
    const { bodyHtml } = useDiaryPanel(true);
    const header = (<header className="ui-panel__header diary-panel__header" data-panel-drag-handle>
      <div className="diary-panel__header-main">
        <span className="diary-panel__tag">ITEM // SOULBOUND</span>
        <h2 className="ui-panel__title diary-panel__title">Diário de Memórias</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar Diário" onClick={() => closeHudWindow('diary')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="diary" className="ui-panel--diary" title="Diário de Memórias" focused={focused} customHeader={header} bodyClassName="ui-panel__body diary-panel__body">
      <div className="diary-panel__scroll">
        <HtmlInject html={bodyHtml}/>
      </div>
    </MovablePanelShell>);
}
