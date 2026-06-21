import { useEffect, useRef, useState } from 'react';
import { BATTLE_SURRENDER_VOLT_PENALTY } from '../../../../shared/combat/battleSurrenderConstants.js';
import { formatVolts } from '../../../../shared/economy/premiumCurrency.js';
import { getSurrenderConfirmBridge } from '../../bridge/surrenderConfirmBridge.js';

export function BattleSurrenderConfirmPanel() {
  const [open, setOpen] = useState(() => getSurrenderConfirmBridge().isOpen());
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => getSurrenderConfirmBridge().subscribe(setOpen), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        getSurrenderConfirmBridge().dismiss();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        getSurrenderConfirmBridge().confirm();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    cancelRef.current?.focus();

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const penaltyLabel = formatVolts(BATTLE_SURRENDER_VOLT_PENALTY);
  const bridge = getSurrenderConfirmBridge();

  return (
    <div
      className="battle-surrender-confirm pointer-events-auto is-visible fixed inset-0 z-[1000003]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="battle-surrender-confirm-title"
    >
      <button
        type="button"
        className="battle-surrender-confirm__backdrop"
        aria-label="Continuar lutando"
        onClick={() => bridge.dismiss()}
      />
      <div className="battle-surrender-confirm__card vortex-panel">
        <span className="battle-surrender-confirm__tag">COMBATE // FUGA</span>
        <h3 className="battle-surrender-confirm__title" id="battle-surrender-confirm-title">
          Fugir da batalha?
        </h3>
        <p className="battle-surrender-confirm__text">
          Penalidade: <strong>−{penaltyLabel}</strong>. O monstro permanece vivo no mapa.
        </p>
        <p className="battle-surrender-confirm__hint">Você perde a luta e volta ao mundo.</p>
        <div className="battle-surrender-confirm__actions">
          <button
            type="button"
            className="battle-surrender-confirm__btn battle-surrender-confirm__btn--confirm"
            onClick={() => bridge.confirm()}
          >
            Confirmar fuga
          </button>
          <button
            ref={cancelRef}
            type="button"
            className="battle-surrender-confirm__btn battle-surrender-confirm__btn--cancel"
            onClick={() => bridge.dismiss()}
          >
            Continuar lutando
          </button>
        </div>
      </div>
    </div>
  );
}
