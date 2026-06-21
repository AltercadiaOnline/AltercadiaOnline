import type { ReactNode } from 'react';

type GameShellProps = {
  readonly children: ReactNode;
};

/**
 * Envelope da HUD in-game — agrupa battle/world sob a mesma superfície React.
 * Render (canvas/Phaser) permanece em #game-render-host fora desta árvore.
 */
export function GameShell({ children }: GameShellProps) {
  return (
    <div className="game-shell contents" data-ui-surface="game-shell">
      {children}
    </div>
  );
}
