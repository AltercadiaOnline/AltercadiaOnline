import type { LootCasinoHudSnapshot } from '../../bridge/lootCasinoHudBridge.js';

export function LootCasinoLoadingPanel(_props: { snapshot: LootCasinoHudSnapshot }) {
  return (
    <div
      className="victory-screen-overlay victory-screen-overlay--casino loot-casino-screen loot-casino-screen--loading loot-casino-screen--force-viewport"
      role="status"
      aria-live="polite"
      aria-label="Carregando recompensas"
    >
      <div className="victory-screen victory-screen--casino">
        <h2 className="victory-screen__title victory-screen__title--win">Recompensas</h2>
        <p className="victory-screen__loot-hint">Buscando pacote de loot no servidor…</p>
      </div>
    </div>
  );
}
