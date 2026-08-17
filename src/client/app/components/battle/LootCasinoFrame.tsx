import type { ReactNode } from 'react';

type LootCasinoFrameProps = {
  role: 'dialog' | 'status' | 'alertdialog';
  ariaLabel: string;
  ariaModal?: boolean;
  children: ReactNode;
};

/** Overlay full-viewport (estrutura antiga) + cartão compacto no centro. */
export function LootCasinoFrame({
  role,
  ariaLabel,
  ariaModal = false,
  children,
}: LootCasinoFrameProps) {
  return (
    <div
      className="loot-casino-screen loot-casino-screen--force-viewport"
      role={role}
      aria-label={ariaLabel}
      {...(ariaModal ? { 'aria-modal': true as const } : {})}
    >
      <div className="loot-casino-screen__panel">
        {children}
      </div>
    </div>
  );
}
