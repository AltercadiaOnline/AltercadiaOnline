import type { ReactNode } from 'react';
import { UI_LAYER_Z_INDEX } from '../../app/shell/uiLayers.js';

type ZoneTerminalHudChromeProps = {
  readonly title: string;
  readonly titleMeta?: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly wide?: boolean;
  /** Só no minigame: o dimmer absorve clique para não clicar o mapa no meio do código. */
  readonly blockWorld?: boolean;
};

/**
 * Chassis dos terminais de zona — mesmo skin híbrido dos painéis do mundo.
 * Fica fora de WorldPanelsLayer (irmã no App) para não travar movimento ao desmontar.
 */
export function ZoneTerminalHudChrome({
  title,
  titleMeta = 'ZONA',
  onClose,
  children,
  wide = false,
  blockWorld = false,
}: ZoneTerminalHudChromeProps) {
  return (
    <div
      className={`zone-terminal-hud${blockWorld ? ' zone-terminal-hud--block-world' : ''}`}
      style={{ zIndex: UI_LAYER_Z_INDEX.overlay }}
    >
      <div
        className="zone-terminal-hud__dim"
        aria-hidden="true"
        onClick={blockWorld ? undefined : onClose}
      />
      <section
        className={[
          'zone-terminal-hud__panel',
          'world-panel ui-panel ui-panel--open ui-skin-hybrid pointer-events-auto',
          wide ? 'zone-terminal-hud__panel--wide' : '',
        ].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="zone-terminal-hud__header ui-panel__header">
          <h2 className="ui-panel__title zone-terminal-hud__title">
            <span className="ui-panel__title-meta">{titleMeta}</span>
            <span className="ui-panel__title-text">{title}</span>
          </h2>
          <button
            type="button"
            className="ui-panel__close zone-terminal-hud__close"
            aria-label={`Fechar ${title}`}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="zone-terminal-hud__body ui-panel__content">
          {children}
        </div>
      </section>
    </div>
  );
}
