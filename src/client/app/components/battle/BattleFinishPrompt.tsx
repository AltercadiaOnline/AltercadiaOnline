import { confirmBattleFinishStudyGate } from '../../../combat/client/battleFinishStudyGate.js';
import { useBattleHudStore } from '../../battle/battleHudStore.js';

/**
 * Mini HUD central após o hit final — a arena continua visível para estudo.
 */
export function BattleFinishPrompt() {
  const visible = useBattleHudStore((state) => state.finishPromptVisible);
  if (!visible) return null;

  return (
    <div
      className="battle-finish-prompt"
      role="dialog"
      aria-modal="true"
      aria-label="Batalha encerrada"
    >
      <div className="battle-finish-prompt__card">
        <p className="battle-finish-prompt__label">Batalha encerrada</p>
        <button
          type="button"
          className="battle-finish-prompt__confirm"
          onClick={() => confirmBattleFinishStudyGate()}
        >
          Finalizar
        </button>
      </div>
    </div>
  );
}
