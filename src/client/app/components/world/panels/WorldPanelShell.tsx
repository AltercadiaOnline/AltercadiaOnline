import type { ReactNode } from 'react';
import type { UiWindowId } from '../../../../ui/uiEvents.js';

type WorldPanelShellProps = {
  windowId: UiWindowId;
  description: string;
  children?: ReactNode;
};

/** Shell base para painéis React de exploração — substituir conteúdo por migração incremental. */
export function WorldPanelShell({ windowId, description, children }: WorldPanelShellProps) {
  return (
    <div className="flex flex-col gap-3 text-[12px] leading-relaxed text-white/80">
      <p>{description}</p>
      {children}
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
        React · {windowId}
      </p>
    </div>
  );
}
