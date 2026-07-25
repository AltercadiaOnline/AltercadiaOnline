// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useRefractionBoothPanel } from '../../panels/useRefractionBoothPanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function RefractionBoothPanelHud({ focused }) {
    const { viewModel, bodyHtml, bodyClassName, headerMeta, bodyRef, dynamicLayoutOptions, handleClick, } = useRefractionBoothPanel(true);
    const header = (<header className="ui-panel__header refraction-booth__header" data-panel-drag-handle>
      <div className="refraction-booth__header-main">
        <span className="refraction-booth__tag">{headerMeta.tag}</span>
        <h2 className="ui-panel__title refraction-booth__title">{headerMeta.title}</h2>
      </div>
      {headerMeta.showClose ? (<button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar estande" onClick={() => closeHudWindow('refractionBooth')}>
          ×
        </button>) : null}
    </header>);
    return (<MovablePanelShell panelId="refractionBooth" className="ui-panel--refraction-booth" title={viewModel.context.label} focused={focused} customHeader={header} bodyClassName={`ui-panel__body ${bodyClassName}`} dynamicLayoutOptions={dynamicLayoutOptions}>
      <div ref={bodyRef} data-hud-fit-root onClick={handleClick}>
        <HtmlInject html={bodyHtml}/>
      </div>
    </MovablePanelShell>);
}
