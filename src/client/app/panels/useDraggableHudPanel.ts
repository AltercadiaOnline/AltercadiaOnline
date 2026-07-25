// @ts-nocheck
import { useEffect, useRef } from 'react';
import { attachDraggablePanel } from '../../ui/panelDrag.js';
import { UI_PANELS_REACT_HOST_ID } from '../panels/panelLayerHost.js';
import { nextMobileHudPanelZIndex } from '../../ui/panelZIndex.js';
/** Anexa arraste/clamp/z-index de painéis HUD móveis ao nó React. */
export function useDraggableHudPanel({ panelId, focused, enabled = true, }) {
    const panelRef = useRef(null);
    useEffect(() => {
        if (!enabled)
            return;
        const panel = panelRef.current;
        if (!panel)
            return;
        const layer = document.getElementById(UI_PANELS_REACT_HOST_ID)
            ?? panel.closest('.ui-panels-react-host')
            ?? panel.parentElement;
        if (!(layer instanceof HTMLElement))
            return;
        const drag = attachDraggablePanel(panel, layer, {
            panelId,
            handleSelector: '[data-panel-drag-handle], .ui-panel__header',
        });
        drag.ensureDefaultPosition();
        drag.bringToFront();
        return () => drag.dispose();
    }, [enabled, panelId]);
    useEffect(() => {
        if (!enabled || !focused)
            return;
        const panel = panelRef.current;
        if (!panel)
            return;
        panel.style.zIndex = String(nextMobileHudPanelZIndex());
    }, [enabled, focused]);
    return panelRef;
}
