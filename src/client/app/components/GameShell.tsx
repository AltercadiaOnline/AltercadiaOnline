import type { ReactNode } from 'react';

type GameShellProps = {
  readonly children: ReactNode;
};

/**
 * Envelope da HUD in-game — agrupa battle/world sob a mesma superfície React.
 * Render (Construct) permanece em #game-render-host fora desta árvore.
 * Não usar `display:contents` — quebra position:fixed da sidebar em alguns browsers.
 */
export function GameShell({ children }: GameShellProps) {
  return (
    <div className="game-shell" data-ui-surface="game-shell">
      {children}
    </div>
  );
}
