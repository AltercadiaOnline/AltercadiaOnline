import { useEffect, useState } from 'react';
import { getPauseMenuBridge } from '../../bridge/pauseMenuBridge.js';

export function PauseMenuPanel() {
  const [open, setOpen] = useState(() => getPauseMenuBridge().isOpen());

  useEffect(() => getPauseMenuBridge().subscribe(setOpen), []);

  if (!open) return null;

  return (
    <div
      id="pause-menu"
      className="pointer-events-auto fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(5,10,13,0.82)]"
      role="dialog"
      aria-modal="true"
      aria-label="Menu de pausa"
      aria-hidden="false"
    >
      <div className="pause-menu-panel vortex-panel">
        <h2>PAUSA</h2>
        <button
          id="btn-pause-settings"
          type="button"
          onClick={() => getPauseMenuBridge().triggerSettings()}
        >
          Configurações
        </button>
        <button
          id="btn-pause-exit"
          type="button"
          onClick={() => getPauseMenuBridge().triggerExit()}
        >
          Sair do Jogo
        </button>
      </div>
    </div>
  );
}
