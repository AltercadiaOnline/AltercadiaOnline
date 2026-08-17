import { clearLootCasinoSessionHandlers, triggerLootCasinoRetry } from '../../battle/lootCasinoSessionHandlers.js';
import { getLootCasinoHudBridge } from '../../bridge/lootCasinoHudBridge.js';
import type { LootCasinoHudSnapshot } from '../../bridge/lootCasinoHudBridge.js';
import { LootCasinoFrame } from './LootCasinoFrame.js';

type LootCasinoErrorPanelProps = {
  snapshot: LootCasinoHudSnapshot;
};

export function LootCasinoErrorPanel({ snapshot }: LootCasinoErrorPanelProps) {
  const message = snapshot.errorMessage ?? 'Não foi possível carregar as recompensas.';

  return (
    <LootCasinoFrame role="alertdialog" ariaLabel="Erro ao carregar recompensas" ariaModal>
      <h2 className="loot-casino-screen__title">Recompensas indisponíveis</h2>
      <p className="loot-casino-screen__hint">{message}</p>
      <div className="loot-casino-screen__actions">
        <button
          type="button"
          className="loot-casino-screen__collect"
          onClick={() => triggerLootCasinoRetry()}
        >
          Tentar Novamente
        </button>
        <button
          type="button"
          className="loot-casino-screen__exit"
          onClick={() => {
            getLootCasinoHudBridge().dismiss();
            clearLootCasinoSessionHandlers();
          }}
        >
          Fechar
        </button>
      </div>
    </LootCasinoFrame>
  );
}
