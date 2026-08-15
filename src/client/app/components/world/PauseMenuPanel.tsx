import { useEffect, useState } from 'react';
import { getPauseMenuBridge } from '../../bridge/pauseMenuBridge.js';

export function PauseMenuPanel() {
  const [open, setOpen] = useState(() => getPauseMenuBridge().isOpen());

  useEffect(() => getPauseMenuBridge().subscribe(setOpen), []);

  if (!open) return null;

  return (
    <div
      id="pause-menu"
      className="pause-menu pointer-events-auto fixed inset-0 z-[200] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-menu-title"
      aria-hidden="false"
    >
      <div className="pause-menu__backdrop" aria-hidden="true" />
      <div className="pause-menu-panel vortex-panel ui-skin-hybrid ui-skin-hybrid--holo-boost">
        <span className="pause-menu__tag">SISTEMA // ESC</span>
        <h2 id="pause-menu-title" className="pause-menu__title">
          PAUSA
        </h2>
        <p className="pause-menu__hint">Sessão suspensa · mundo em espera</p>
        <div className="pause-menu__actions">
          <button
            id="btn-pause-settings"
            type="button"
            className="pause-menu__btn"
            onClick={() => getPauseMenuBridge().triggerSettings()}
          >
            Configurações
          </button>
          <button
            id="btn-pause-exit"
            type="button"
            className="pause-menu__btn pause-menu__btn--danger"
            onClick={() => getPauseMenuBridge().triggerExit()}
          >
            Sair do Jogo
          </button>
        </div>
      </div>
    </div>
  );
}
