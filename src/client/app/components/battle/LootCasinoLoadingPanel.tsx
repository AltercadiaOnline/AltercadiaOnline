import type { LootCasinoHudSnapshot } from '../../bridge/lootCasinoHudBridge.js';
import { LootCasinoFrame } from './LootCasinoFrame.js';

export function LootCasinoLoadingPanel(_props: { snapshot: LootCasinoHudSnapshot }) {
  return (
    <LootCasinoFrame role="status" ariaLabel="Carregando recompensas">
      <h2 className="loot-casino-screen__title">Recompensas</h2>
      <p className="loot-casino-screen__hint">Buscando pacote de loot no servidor…</p>
    </LootCasinoFrame>
  );
}
