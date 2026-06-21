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
import {
  getLootCasinoHudBridge,
  isReactLootCasinoEnabled,
} from '../../app/bridge/lootCasinoHudBridge.js';
import { getPostBattleHudBridge } from '../../app/bridge/postBattleHudBridge.js';
import {
  destroyActiveLootCasino,
  showLootCasinoErrorOverlay,
  showLootCasinoLoadingOverlay,
  showLootCasinoScreen,
} from './LootCasinoScreen.js';

export type BattleLootCasinoFlowOptions = {
  readonly battleId: string;
  readonly lootContext?: BattleLootLoadContext;
};

function dimPostBattleHub(active: boolean): void {
  if (isReactLootCasinoEnabled()) {
    getLootCasinoHudBridge().setHubDimmed(active);
    return;
  }
  document.querySelectorAll<HTMLElement>('.post-battle-hub').forEach((hub) => {
    hub.style.setProperty('opacity', active ? '0.35' : '1', 'important');
    hub.style.setProperty('pointer-events', active ? 'none' : 'auto', 'important');
  });
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

async function openReactBattleLootCasinoOnDemand(
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

/**
 * Cassino sob demanda — pacote autoritativo, try/catch com retry.
 */
export async function openBattleLootCasinoOnDemand(
  options: BattleLootCasinoFlowOptions,
): Promise<void> {
  if (isReactLootCasinoEnabled()) {
    await openReactBattleLootCasinoOnDemand(options);
    return;
  }

  const { battleId } = options;
  const lootContext = options.lootContext ?? {};

  console.log('[PostBattle] Abrindo cassino de recompensas…', { battleId });

  destroyActiveLootCasino();
  dimPostBattleHub(true);

  const loading = showLootCasinoLoadingOverlay();

  try {
    const pkg = await loadBattleLootPackageOnDemand(battleId, undefined, lootContext);
    loading.destroy();
    console.log('[PostBattle] Pacote de loot pronto', { battleId, lootId: pkg.lootId });

    void showLootCasinoScreen({
      slots: pkg.lootReveal,
      onSpinSettled: () => {
        dimPostBattleHub(false);
      },
      onDismiss: () => {
        dismissPendingBattleLootForBattle(battleId);
      },
      onConfirm: async () => {
        const result = await requestBattleLootCollection(pkg.lootId, battleId);
        if (!result.ok) return false;

        consumeBattleLootPackage(battleId);
        consumePendingBattleLoot();
        return true;
      },
    }).finally(() => {
      dimPostBattleHub(false);
    });
  } catch (error) {
    loading.destroy();
    dimPostBattleHub(false);
    console.error('[PostBattle] Falha ao carregar loot para cassino:', error);
    const message =
      error instanceof Error ? error.message : 'Não foi possível carregar as recompensas.';

    showLootCasinoErrorOverlay(document.body, {
      message,
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
  if (isReactLootCasinoEnabled()) {
    clearLootCasinoSessionHandlers();
  }
  dismissPendingBattleLootForBattle(battleId);
}
