import { dismissBattleLootOnServer, requestBattleLootCollection } from '../../game/battleLootClient.js';
import {
  loadBattleLootPackageOnDemand,
  type BattleLootLoadContext,
} from '../../hud/battleLootOnDemand.js';
import {
  consumeBattleLootPackage,
  peekBattleLootPackage,
} from '../../hud/battleLootPackageBuffer.js';
import { consumePendingBattleLoot } from '../../hud/battleLootBuffer.js';
import {
  clearLootCasinoSessionHandlers,
  registerLootCasinoSessionHandlers,
} from '../../app/battle/lootCasinoSessionHandlers.js';
import { getLootCasinoHudBridge } from '../../app/bridge/lootCasinoHudBridge.js';
import { getPostBattleHudBridge } from '../../app/bridge/postBattleHudBridge.js';
import { destroyActiveLootCasino } from './LootCasinoScreen.js';

export type BattleLootCasinoFlowOptions = {
  readonly battleId: string;
  readonly lootContext?: BattleLootLoadContext;
};

function dimPostBattleHub(active: boolean): void {
  getLootCasinoHudBridge().setHubDimmed(active);
}

function dismissPendingBattleLootForBattle(battleId: string): void {
  const pkg = peekBattleLootPackage(battleId);
  if (!pkg) return;
  dismissBattleLootOnServer(pkg.lootId);
  consumeBattleLootPackage(battleId);
  consumePendingBattleLoot();
}

function registerReactLootCasinoHandlers(
  battleId: string,
  options: BattleLootCasinoFlowOptions,
): void {
  const bridge = getLootCasinoHudBridge();

  registerLootCasinoSessionHandlers({
    onSpinSettled: () => {
      dimPostBattleHub(false);
    },
    onDismiss: () => {
      dismissPendingBattleLootForBattle(battleId);
    },
    onConfirm: async () => {
      const lootId = bridge.snapshot().lootId;
      if (!lootId) return false;

      const result = await requestBattleLootCollection(lootId, battleId);
      if (!result.ok) return false;

      consumeBattleLootPackage(battleId);
      consumePendingBattleLoot();
      return true;
    },
    onRetry: () => {
      void openBattleLootCasinoOnDemand(options);
    },
  });
}

/** Cassino sob demanda — pacote autoritativo via bridge React. */
export async function openBattleLootCasinoOnDemand(
  options: BattleLootCasinoFlowOptions,
): Promise<void> {
  const { battleId } = options;
  const lootContext = options.lootContext ?? {};
  const bridge = getLootCasinoHudBridge();

  console.log('[PostBattle] Abrindo cassino de recompensas (React)…', { battleId });

  destroyActiveLootCasino();
  dimPostBattleHub(true);
  bridge.showLoading(battleId);
  registerReactLootCasinoHandlers(battleId, options);

  try {
    const pkg = await loadBattleLootPackageOnDemand(battleId, undefined, lootContext);
    console.log('[PostBattle] Pacote de loot pronto', { battleId, lootId: pkg.lootId });
    bridge.presentScreen(battleId, pkg.lootId, pkg.lootReveal);
    getPostBattleHudBridge().setRewardsOpening(false);
  } catch (error) {
    dimPostBattleHub(false);
    getPostBattleHudBridge().setRewardsOpening(false);
    console.error('[PostBattle] Falha ao carregar loot para cassino:', error);
    const message =
      error instanceof Error ? error.message : 'Não foi possível carregar as recompensas.';
    bridge.showError(message, battleId);
    registerLootCasinoSessionHandlers({
      onRetry: () => {
        void openBattleLootCasinoOnDemand(options);
      },
    });
  }
}

/** Descarta cassino e pacote pendente ao sair sem coletar. */
export function teardownBattleLootCasinoState(battleId: string): void {
  dimPostBattleHub(false);
  destroyActiveLootCasino();
  clearLootCasinoSessionHandlers();
  dismissPendingBattleLootForBattle(battleId);
}
