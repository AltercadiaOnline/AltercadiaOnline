import type { CSSProperties, ReactNode } from 'react';
import type { UiWindowId } from '../../../ui/uiEvents.js';
import { resolveWorldPanelTitle } from '../../panels/worldPanelRegistry.js';

type MovablePanelFrameProps = {
  windowId: UiWindowId;
  title?: string;
  focused?: boolean;
  zIndex: number;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  hideCloseButton?: boolean;
  onClose: () => void;
  onFocus: () => void;
  children: ReactNode;
};

export function MovablePanelFrame({
  windowId,
  title,
  focused = false,
  zIndex,
  panelClassName = '',
  panelStyle,
  hideCloseButton = false,
  onClose,
  onFocus,
  children,
}: MovablePanelFrameProps) {
  const resolvedTitle = title ?? resolveWorldPanelTitle(windowId);

  return (
    <section
      className={[
        'world-panel pointer-events-auto absolute flex max-h-[min(420px,82vh)] w-[min(360px,92vw)] flex-col overflow-hidden rounded-lg border shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm',
        panelClassName,
        focused
          ? 'border-alter-accent/70 bg-[rgba(8,14,16,0.96)]'
          : 'border-white/15 bg-[rgba(8,12,14,0.92)]',
      ].filter(Boolean).join(' ')}
      style={{
        zIndex,
        top: '3.5rem',
        right: '1rem',
        ...panelStyle,
      }}
      role="dialog"
      aria-modal="false"
      aria-label={resolvedTitle}
      data-world-panel={windowId}
      onMouseDown={onFocus}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <h2 className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-alter-accent">
          {resolvedTitle}
        </h2>
        <button
          type="button"
          className="rounded border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/70 hover:border-alter-accent/60 hover:text-alter-accent"
          aria-label={`Fechar ${resolvedTitle}`}
          onClick={onClose}
          hidden={hideCloseButton}
        >
          ×
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {children}
      </div>
    </section>
  );
}
