// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useMarcosPanel } from '../../panels/useMarcosPanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function MarcosPanelHud({ focused }) {
    const { treeHtml, legendHtml, overlayHtml, handleClick, handleMouseOver, handleMouseLeave, } = useMarcosPanel(true);
    const header = (<header className="ui-panel__header" data-panel-drag-handle>
      <div>
        <span className="marcos-panel__tag">PROGRESSÃO // MARCOS</span>
        <h2 className="ui-panel__title">Habilidade Marcos</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar Habilidade Marcos" onClick={() => closeHudWindow('marcos')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="marcos" className="ui-panel--marcos" title="Habilidade Marcos" focused={focused} customHeader={header} bodyClassName="ui-panel__body marcos-panel__body" dynamicLayoutOptions={{
            fitRootSelector: '[data-hud-fit-root]',
            secondarySelector: '[data-hud-fit-secondary]',
            minVisibleItems: 99,
        }}>
      <div data-hud-fit-root onClick={handleClick} onMouseOver={handleMouseOver} onMouseLeave={handleMouseLeave}>
        <div className="marcos-panel__tree-area">
          <HtmlInject html={treeHtml}/>
          <p className="marcos-panel__legend" data-hud-fit-secondary dangerouslySetInnerHTML={{ __html: legendHtml }}/>
        </div>
        {overlayHtml ? <HtmlInject html={overlayHtml}/> : null}
      </div>
    </MovablePanelShell>);
}
