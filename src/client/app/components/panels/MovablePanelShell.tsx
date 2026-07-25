// @ts-nocheck
import { attachHudDynamicLayout } from '../../../ui/layout/hudDynamicLayout.js';
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useDraggableHudPanel } from '../../panels/useDraggableHudPanel.js';
import { getPanelsBridge } from '../../bridge/panelsBridge.js';
import { useEffect } from 'react';
export function MovablePanelShell({ panelId, className = '', headerClassName = 'ui-panel__header', headerMainClassName = 'ui-panel__header-main', title, focused, headerMeta, customHeader, bodyClassName = 'ui-panel__body', dynamicLayoutOptions, children, }) {
    const panelRef = useDraggableHudPanel({ panelId, focused });
    useEffect(() => {
        const panel = panelRef.current;
        if (!panel)
            return;
        const disposer = attachHudDynamicLayout(panel, dynamicLayoutOptions);
        return () => disposer();
    }, [dynamicLayoutOptions, panelRef]);
    const defaultHeader = (<header className={headerClassName} data-panel-drag-handle>
      <div className={headerMainClassName}>
        <h2 className="ui-panel__title">{title}</h2>
        {headerMeta}
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label={`Fechar ${title}`} onClick={() => closeHudWindow(panelId)}>
        ×
      </button>
    </header>);
    return (<div ref={panelRef} id={`ui-panel-${panelId}`} className={[
            'ui-panel',
            'ui-panel--open',
            'ui-interactive',
            'ui-panel--movable',
            'pointer-events-auto',
            className,
        ].filter(Boolean).join(' ')} data-ui-panel={panelId} role="dialog" aria-label={title} onPointerDown={() => getPanelsBridge().notifyPanelFocused(panelId)}>
      {customHeader ?? defaultHeader}
      {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
    </div>);
}
