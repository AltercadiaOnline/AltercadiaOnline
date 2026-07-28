import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { UiWindowId } from '../../../ui/uiEvents.js';
import { attachDraggablePanel } from '../../../ui/panelDrag.js';
import { resolveWorldPanelTitle } from '../../panels/worldPanelRegistry.js';

type MovablePanelFrameProps = {
  windowId: UiWindowId;
  title?: string;
  /** Marcação industrial decorativa ao lado do título (ex.: inventário). */
  titleMeta?: string;
  focused?: boolean;
  zIndex: number;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  hideCloseButton?: boolean;
  /** `hidden` — scroll só nas áreas internas do painel (ex.: terminal de mercado). */
  bodyOverflow?: 'auto' | 'hidden';
  onClose: () => void;
  onFocus: () => void;
  children: ReactNode;
};

/**
 * Janela HUD arrastável — `attachDraggablePanel` (DOM + rAF + translate3d).
 * Posição no compositor (não left/top); React só controla z-index / foco / conteúdo.
 */
export function MovablePanelFrame({
  windowId,
  title,
  titleMeta,
  focused = false,
  zIndex,
  panelClassName = '',
  panelStyle,
  hideCloseButton = false,
  bodyOverflow = 'auto',
  onClose,
  onFocus,
  children,
}: MovablePanelFrameProps) {
  const panelRef = useRef<HTMLElement>(null);
  const resolvedTitle = title ?? resolveWorldPanelTitle(windowId);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;

    const layer =
      panel.closest<HTMLElement>('[data-ui-surface="world-panels"]')
      ?? panel.parentElement;
    if (!layer) return undefined;

    const controller = attachDraggablePanel(panel, layer, {
      panelId: windowId,
      handleSelector: '[data-panel-drag-handle]',
    });
    controller.ensureDefaultPosition();

    return () => {
      controller.dispose();
    };
  }, [windowId]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.zIndex = String(zIndex);
  }, [zIndex]);

  return (
    <section
      ref={panelRef}
      className={[
        'world-panel ui-panel ui-panel--open ui-panel--movable ui-skin-hybrid pointer-events-auto absolute left-0 top-0 flex max-h-[min(420px,82vh)] w-[min(360px,92vw)] flex-col overflow-hidden border shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
        panelClassName,
        focused
          ? 'ui-skin-hybrid--focused border-[rgba(58,208,214,0.55)] bg-[rgba(13,14,16,0.96)]'
          : 'border-[rgba(58,63,68,0.95)] bg-[rgba(13,14,16,0.92)]',
      ].filter(Boolean).join(' ')}
      style={{
        zIndex,
        ...panelStyle,
      }}
      role="dialog"
      aria-modal="false"
      aria-label={resolvedTitle}
      data-world-panel={windowId}
      onMouseDown={onFocus}
    >
      <header
        className="ui-panel__header flex cursor-grab items-center justify-between gap-3 border-b border-white/10 px-3 py-2 active:cursor-grabbing"
        data-panel-drag-handle
      >
        <h2 className="ui-panel__title flex min-w-0 items-center gap-2 truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c8d4dc]">
          {titleMeta ? (
            <span className="ui-panel__title-meta shrink-0 font-medium tracking-[0.14em] text-[rgba(58,208,214,0.72)]">
              {titleMeta}
            </span>
          ) : null}
          <span className="ui-panel__title-text truncate">{resolvedTitle}</span>
        </h2>
        <button
          type="button"
          className="ui-panel__close rounded-none border border-[rgba(58,63,68,0.95)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#a8b0b8] hover:border-[rgba(58,208,214,0.55)] hover:text-[#d7f6f8]"
          aria-label={`Fechar ${resolvedTitle}`}
          data-action="close"
          data-panel-no-drag
          onClick={onClose}
          hidden={hideCloseButton}
        >
          ×
        </button>
      </header>
      <div
        className={[
          'min-h-0 flex-1',
          bodyOverflow === 'hidden'
            ? 'flex flex-col overflow-hidden'
            : 'overflow-auto p-3',
        ].join(' ')}
      >
        {children}
      </div>
    </section>
  );
}
