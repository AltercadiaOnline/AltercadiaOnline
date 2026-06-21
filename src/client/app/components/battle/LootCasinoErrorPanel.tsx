import { clearLootCasinoSessionHandlers, triggerLootCasinoRetry } from '../../battle/lootCasinoSessionHandlers.js';
import { getLootCasinoHudBridge } from '../../bridge/lootCasinoHudBridge.js';
import type { LootCasinoHudSnapshot } from '../../bridge/lootCasinoHudBridge.js';

type LootCasinoErrorPanelProps = {
  snapshot: LootCasinoHudSnapshot;
};

export function LootCasinoErrorPanel({ snapshot }: LootCasinoErrorPanelProps) {
  const message = snapshot.errorMessage ?? 'Não foi possível carregar as recompensas.';

  return (
    <div
      className="victory-screen-overlay victory-screen-overlay--casino loot-casino-screen loot-casino-screen--error loot-casino-screen--force-viewport"
      role="alertdialog"
      aria-modal="true"
      aria-label="Erro ao carregar recompensas"
    >
      <div className="victory-screen victory-screen--casino">
        <h2 className="victory-screen__title">Recompensas indisponíveis</h2>
        <p className="victory-screen__loot-hint">{message}</p>
        <div className="battle-decision-actions">
          <button
            type="button"
            className="victory-screen__reveal"
            onClick={() => triggerLootCasinoRetry()}
          >
            Tentar Novamente
          </button>
          <button
            type="button"
            className="victory-screen__close"
            onClick={() => {
              getLootCasinoHudBridge().dismiss();
              clearLootCasinoSessionHandlers();
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
