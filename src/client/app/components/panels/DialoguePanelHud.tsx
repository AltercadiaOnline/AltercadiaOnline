// @ts-nocheck
import { useEffect } from 'react';
import { attachHudDynamicLayout } from '../../../ui/layout/hudDynamicLayout.js';
import { nextMobileHudPanelZIndex } from '../../../ui/panelZIndex.js';
import { getPanelsBridge } from '../../bridge/panelsBridge.js';
import { useDialoguePanel } from '../../panels/useDialoguePanel.js';
import { HtmlInject } from './HtmlInject.js';
export function DialoguePanelHud({ focused }) {
    const { state, headerHtml, bodyHtml, panelClassName, isCael, panelRef, bodyRef, handleClick, } = useDialoguePanel(true);
    useEffect(() => {
        const panel = panelRef.current;
        if (!panel || !isCael)
            return;
        const disposer = attachHudDynamicLayout(panel);
        return () => disposer();
    }, [isCael, bodyHtml, panelRef]);
    useEffect(() => {
        if (!focused)
            return;
        const panel = panelRef.current;
        if (!panel)
            return;
        panel.style.zIndex = String(nextMobileHudPanelZIndex());
    }, [focused, panelRef]);
    const title = state.npcName || (isCael ? 'Ancião Cael' : 'Diálogo');
    return (<div ref={panelRef} id="ui-panel-dialogue" className={[
            panelClassName,
            'ui-panel--open',
            'ui-interactive',
            'pointer-events-auto',
        ].join(' ')} data-ui-panel="dialogue" role="dialog" aria-label={title} onPointerDown={() => getPanelsBridge().notifyPanelFocused('dialogue')}>
      <div onClick={handleClick}>
        <HtmlInject html={headerHtml}/>
        <div ref={bodyRef}>
          <HtmlInject html={bodyHtml}/>
        </div>
      </div>
    </div>);
}
