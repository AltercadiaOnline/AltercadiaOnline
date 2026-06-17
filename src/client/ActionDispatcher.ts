import type { PlayerWorldVitals } from '../shared/character/equipmentState.js';
import type { SkinSlotId } from '../shared/character/playerSkin.js';
import type { BankCurrencyTypeId } from '../shared/bank/bankConstants.js';
import type { MarcoProgressTriggerId } from '../shared/progression/marcoProgressCatalog.js';
import type { RotatePlayerIntentPayload } from '../shared/world/movementIntent.js';
import type { IEconomyService } from './economy/IEconomyService.js';
import { requestBankTransaction } from './economy/bankTransactionClient.js';
import { requestAlterToVoltsExchange } from './economy/walletExchangeClient.js';
import { getMutableDataStore } from './PlayerDataStore.js';
import {
  isClientAuthoritativeVendorAction,
  isVendorClientAction,
  shouldWaitForServer,
} from './sync/intentPolicy.js';
import {
  getPendingIntentRegistry,
  resetPendingIntentRegistry,
  type PendingIntent,
} from './sync/pendingIntentRegistry.js';
import { resetPendingActionsStore } from './sync/pendingActionsStore.js';
import { getGameStore } from './state/GameStore.js';
import type { PendingActionKind } from '../shared/sync/pendingActionProtocol.js';
import {
  equipFromInventoryFailureMessage,
  equipInventoryItemToSet,
  validateEquipInventoryItemToSet,
} from './ui/equipment/equipFromInventory.js';
import {
  unequipFailureMessage,
  unequipSlotToInventory,
  validateUnequipSlotToInventory,
} from './ui/equipment/unequipToInventory.js';
import {
  resolveToggleItemSlotServerAction,
  toggleItemSlot,
  validateToggleItemSlot,
} from './ui/equipment/toggleItemSlot.js';
import type { EquipmentUiSlotId } from '../shared/character/equipmentUiSlots.js';
import { getPlayerMarcosStore } from './ui/marcos/playerMarcosStore.js';
import { resolveMarcoChooseBlockedMessage } from '../shared/progression/milestoneTreeState.js';
import { formatVolts } from '../shared/economy/premiumCurrency.js';
import { healPlayer } from '../shared/world/npcHealService.js';
import { getPlayerEquipmentStore } from './ui/equipment/playerEquipmentStore.js';
import { getGlobalPlayerStore } from './ui/moveset/globalPlayerStore.js';
import { getPlayerWalletStore } from './ui/wallet/playerWalletStore.js';
import { confirmTransaction, rejectTransaction } from './core/GameTransactionCoordinator.js';
import { alertSystem } from './ui/alertSystem.js';
import { getPlayerSkinStore } from './ui/character/playerSkinStore.js';
import { getPlayerPetStore } from './ui/pet/playerPetStore.js';
import {
  executeCaelBuyPetRation,
  executePetFeedSpecialRation,
} from './pet/caelPetActions.js';
import { getPlayerMarketStore } from './ui/market/playerMarketStore.js';
import { getMarketplaceBuyOrderStore } from './ui/market/marketplaceBuyOrderStore.js';
import { getPlayerInventoryStore } from './ui/inventory/playerInventoryStore.js';
import { getCarryCapacityStore } from './ui/capacity/carryCapacityStore.js';
import { validatePetPurchase, buildAdoptedPet } from '../shared/economy/petTrainerService.js';
import type { PetKindId } from '../shared/pet/petCatalog.js';
import type { PetColorId } from '../shared/pet/petColorPalette.js';
import type { PetGenderId } from '../shared/pet/petGender.js';
import type { SyncLoadoutPayload } from '../shared/world/playerLoadout.js';
import { buildSyncLoadoutPayload } from './equipment/resolveSyncLoadoutPayload.js';
import type { MovePlayerIntentPayload } from '../shared/world/movementIntent.js';
import { createIntentId } from '../shared/intent/clientIntent.js';
import { resetUIIntentStore } from './ui/intent/uiIntentStore.js';

/** Intenções emitidas pela UI — formato único type + payload. */
export type ClientAction =
  | { readonly type: 'EXCHANGE_ALTER_FOR_VOLTS'; readonly payload: { readonly alterAmount: number } }
  | { readonly type: 'SELECT_MARCO_BRANCH'; readonly payload: { readonly starterNodeId: string } }
  | { readonly type: 'CHOOSE_MARCO'; readonly payload: { readonly nodeId: string } }
  | { readonly type: 'RESET_MARCO_TRAIL'; readonly payload: Record<string, never> }
  | {
      readonly type: 'PROGRESS_MARCO';
      readonly payload: {
        readonly events: readonly {
          readonly trigger: MarcoProgressTriggerId;
          readonly count: number;
        }[];
      };
    }
  | { readonly type: 'DEPOSIT_ITEM'; readonly payload: { readonly itemId: string; readonly quantity?: number } }
  | { readonly type: 'WITHDRAW_ITEM'; readonly payload: { readonly itemId: string; readonly quantity?: number } }
  | {
      readonly type: 'DEPOSIT_CURRENCY';
      readonly payload: { readonly currency: BankCurrencyTypeId; readonly amount: number };
    }
  | {
      readonly type: 'WITHDRAW_CURRENCY';
      readonly payload: { readonly currency: BankCurrencyTypeId; readonly amount: number };
    }
  | {
      readonly type: 'EQUIP_ITEM';
      readonly payload: { readonly itemId: string; readonly slot?: EquipmentUiSlotId };
    }
  | {
      readonly type: 'EQUIP_FROM_INVENTORY';
      readonly payload: { readonly itemId: string; readonly uiSlotId?: EquipmentUiSlotId; readonly slotIndex?: number };
    }
  | {
      readonly type: 'UNEQUIP_TO_INVENTORY';
      readonly payload: { readonly slotId: EquipmentUiSlotId };
    }
  | {
      readonly type: 'SYNC_LOADOUT';
      readonly payload: SyncLoadoutPayload;
    }
  | { readonly type: 'PURCHASE_SKIN'; readonly payload: { readonly slot: SkinSlotId; readonly optionId: string } }
  | {
      readonly type: 'PURCHASE_NPC_ITEM';
      readonly payload: { readonly vendorId: string; readonly itemId: string; readonly quantity: number };
    }
  | {
      readonly type: 'SELL_NPC_ITEM';
      readonly payload: { readonly vendorId: string; readonly itemId: string; readonly quantity: number };
    }
  | {
      readonly type: 'HEAL_AT_NPC';
      readonly payload: {
        readonly npcId: string;
        readonly clientVitals?: PlayerWorldVitals;
        readonly clientMapId?: string;
        readonly clientPosition?: { readonly x: number; readonly y: number };
      };
    }
  | { readonly type: 'CAEL_BUY_PET_RATION'; readonly payload: { readonly npcId: string } }
  | { readonly type: 'PET_FEED_SPECIAL_RATION'; readonly payload: { readonly slotIndex?: number } }
  | {
      readonly type: 'PURCHASE_PET';
      readonly payload: {
        readonly vendorId: string;
        readonly kindId: PetKindId;
        readonly name: string;
        readonly colorId: PetColorId;
        readonly gender: PetGenderId;
      };
    }
  | { readonly type: 'STAGE_BATTLE_LOOT'; readonly payload: { readonly sourceId: string; readonly battleId: string; readonly defeatedLevel?: number } }
  | { readonly type: 'COLLECT_BATTLE_LOOT'; readonly payload: { readonly lootId: string; readonly battleId: string } }
  | { readonly type: 'DISMISS_BATTLE_LOOT'; readonly payload: { readonly lootId: string } }
  | {
      readonly type: 'CREATE_MARKET_LISTING';
      readonly payload: {
        readonly itemId: string;
        readonly quantity: number;
        readonly unitPriceVolts: number;
        readonly anonymous?: boolean;
      };
    }
  | {
      readonly type: 'CREATE_MARKET_BUY_ORDER';
      readonly payload: {
        readonly itemId: string;
        readonly quantity: number;
        readonly unitPriceVolts: number;
        readonly anonymous?: boolean;
      };
    }
  | {
      readonly type: 'COLLECT_MARKET_VOLTS';
      readonly payload: { readonly listingId: string };
    }
  | {
      readonly type: 'CANCEL_MARKET_LISTING';
      readonly payload: { readonly listingId: string };
    }
  | {
      readonly type: 'CANCEL_MARKET_BUY_ORDER';
      readonly payload: { readonly orderId: string };
    }
  | {
      readonly type: 'MOVE_INTENT';
      readonly payload: MovePlayerIntentPayload;
    }
  | {
      readonly type: 'ROTATE_INTENT';
      readonly payload: RotatePlayerIntentPayload;
    }
  | {
      readonly type: 'CRAFT_ITEM';
      readonly payload: {
        readonly craftStationId: string;
        readonly recipeId: string;
        readonly quantity?: number;
      };
    };

export type DispatchResult =
  | { readonly ok: true; readonly status: 'applied' }
  | { readonly ok: true; readonly status: 'pending'; readonly intentId: string }
  | { readonly ok: false; readonly reason: string };

export type ActionDispatcherMode = 'local' | 'online' | 'mock';

export type IntentTransport = (intent: PendingIntent) => void;

/** Tempo máximo aguardando confirmação do servidor antes de liberar a UI. */
export const PENDING_INTENT_TIMEOUT_MS = 12_000;

const PENDING_INTENT_TIMEOUT_MESSAGE =
  'Servidor não confirmou a ação a tempo. Nenhuma alteração foi aplicada — tente novamente.';

/**
 * Único ponto de intenções da interface.
 * Com IEconomyService (mock/supabase): aguarda snapshot autoritativo após delay/rede.
 */
export class ActionDispatcher {
  private mode: ActionDispatcherMode = 'local';
  private intentTransport: IntentTransport | null = null;
  private economyService: IEconomyService | null = null;
  private pendingIntentTimeoutMs = PENDING_INTENT_TIMEOUT_MS;
  private readonly intentTimeoutHandles = new Map<string, ReturnType<typeof setTimeout>>();

  setMode(mode: ActionDispatcherMode): void {
    this.mode = mode;
  }

  getMode(): ActionDispatcherMode {
    return this.mode;
  }

  setIntentTransport(transport: IntentTransport | null): void {
    this.intentTransport = transport;
  }

  setEconomyService(service: IEconomyService | null): void {
    this.economyService = service;
  }

  /** Reduz timeout em testes automatizados. */
  setPendingIntentTimeoutMs(ms: number): void {
    this.pendingIntentTimeoutMs = ms;
  }

  /** Fast lane — movimento de exploração; ack via state-sync tick (sem pending). */
  dispatchMoveIntent(payload: MovePlayerIntentPayload): void {
    if (this.mode !== 'online' || !this.intentTransport) return;
    this.intentTransport({
      intentId: createIntentId(),
      action: { type: 'MOVE_INTENT', payload },
      timestamp: Date.now(),
    });
  }

  /** Pivot CTRL — ack via state-sync tick com facing atualizado. */
  dispatchRotateIntent(payload: RotatePlayerIntentPayload): void {
    if (this.mode !== 'online' || !this.intentTransport) return;
    this.intentTransport({
      intentId: createIntentId(),
      action: { type: 'ROTATE_INTENT', payload },
      timestamp: Date.now(),
    });
  }

  dispatch(action: ClientAction): DispatchResult {
    if (this.mode === 'online' && this.isItemMutation(action)) {
      const mutationAction = action.type === 'EQUIP_ITEM'
        ? resolveToggleItemSlotServerAction(action.payload.itemId, action.payload.slot)
        : action;
      if (!mutationAction) {
        return { ok: false, reason: 'Item não encontrado.' };
      }
      const check = this.validateItemMutation(
        action.type === 'EQUIP_ITEM' ? action : mutationAction,
      );
      if (!check.ok) return check;

      const loadoutPayload = buildSyncLoadoutPayload(mutationAction);
      if (!loadoutPayload) {
        return { ok: false, reason: 'Não foi possível sincronizar o SET com o servidor.' };
      }

      // Online: SYNC_LOADOUT — mutação otimista + snapshot para rollback.
      return this.dispatchPending(
        {
          type: 'SYNC_LOADOUT',
          payload: loadoutPayload,
        },
        () => {
          this.applyItemMutationLocally(mutationAction);
          getMutableDataStore().bumpRevision('inventory');
        },
      );
    }

    if (this.mode === 'online' && this.isBankAction(action)) {
      return this.dispatchPending(action);
    }

    if (this.mode === 'online' && isVendorClientAction(action)) {
      return this.dispatchPending(action);
    }

    if (this.mode === 'online' && action.type === 'CRAFT_ITEM') {
      return this.dispatchPending(action);
    }

    if (this.mode === 'mock' && isClientAuthoritativeVendorAction(action, this.mode)) {
      return this.dispatchLocal(action);
    }

    if (this.economyService) {
      return this.dispatchViaEconomyService(action);
    }

    if (shouldWaitForServer(action, this.mode)) {
      return this.dispatchPending(action);
    }

    return this.dispatchLocal(action);
  }

  private isItemMutation(action: ClientAction): boolean {
    return (
      action.type === 'EQUIP_ITEM'
      || action.type === 'EQUIP_FROM_INVENTORY'
      || action.type === 'UNEQUIP_TO_INVENTORY'
    );
  }

  /** Online/mock/local: muta só `PlayerItemRecord.slot` no array único + PLAYER_ITEMS_UPDATED. */
  private applyItemMutationLocally(action: ClientAction): DispatchResult {
    switch (action.type) {
      case 'EQUIP_ITEM': {
        const toggle = toggleItemSlot(action.payload.itemId, action.payload.slot);
        if (!toggle.ok) {
          return { ok: false, reason: toggle.reason };
        }
        return { ok: true, status: 'applied' };
      }
      case 'EQUIP_FROM_INVENTORY': {
        const equip = equipInventoryItemToSet(
          action.payload.itemId,
          action.payload.uiSlotId,
        );
        if (!equip.ok) {
          return { ok: false, reason: equipFromInventoryFailureMessage(equip.reason) };
        }
        return { ok: true, status: 'applied' };
      }
      case 'UNEQUIP_TO_INVENTORY': {
        const unequip = unequipSlotToInventory(action.payload.slotId);
        if (!unequip.ok) {
          return { ok: false, reason: unequipFailureMessage(unequip.reason) };
        }
        return { ok: true, status: 'applied' };
      }
      default:
        return { ok: false, reason: 'Ação inválida.' };
    }
  }

  /** Online: só valida regras locais — servidor confirma via InventoryUpdated. */
  private validateItemMutation(action: ClientAction): DispatchResult {
    switch (action.type) {
      case 'EQUIP_ITEM': {
        const toggle = validateToggleItemSlot(action.payload.itemId, action.payload.slot);
        if (!toggle.ok) {
          return { ok: false, reason: toggle.reason };
        }
        return { ok: true, status: 'applied' };
      }
      case 'EQUIP_FROM_INVENTORY': {
        const equip = validateEquipInventoryItemToSet(
          action.payload.itemId,
          action.payload.uiSlotId,
        );
        if (!equip.ok) {
          return { ok: false, reason: equipFromInventoryFailureMessage(equip.reason) };
        }
        return { ok: true, status: 'applied' };
      }
      case 'UNEQUIP_TO_INVENTORY': {
        const unequip = validateUnequipSlotToInventory(action.payload.slotId);
        if (!unequip.ok) {
          return { ok: false, reason: unequipFailureMessage(unequip.reason) };
        }
        return { ok: true, status: 'applied' };
      }
      default:
        return { ok: false, reason: 'Ação inválida.' };
    }
  }

  private isBankAction(action: ClientAction): boolean {
    switch (action.type) {
      case 'DEPOSIT_ITEM':
      case 'WITHDRAW_ITEM':
      case 'DEPOSIT_CURRENCY':
      case 'WITHDRAW_CURRENCY':
        return true;
      default:
        return false;
    }
  }

  /** Canal WS dedicado — não enviar player-intent paralelo (evita UNKNOWN_ACTION_TYPE). */
  private usesDedicatedWsTransport(action: ClientAction): boolean {
    return this.isBankAction(action) || action.type === 'EXCHANGE_ALTER_FOR_VOLTS';
  }

  confirmIntent(intentId: string): void {
    this.clearIntentTimeout(intentId);
    confirmTransaction(intentId);
    getPendingIntentRegistry().resolve(intentId);
  }

  rejectIntent(intentId: string, error?: unknown, options?: { readonly silent?: boolean }): void {
    this.clearIntentTimeout(intentId);
    rejectTransaction(intentId, error, 'Ação rejeitada pelo servidor.', options);
    getPendingIntentRegistry().reject(intentId);
  }

  private resolvePendingKind(action: ClientAction): PendingActionKind {
    if (action.type === 'SYNC_LOADOUT' || this.isItemMutation(action)) {
      return 'player-intent';
    }
    if (
      this.isBankAction(action)
      || isVendorClientAction(action)
      || action.type === 'CRAFT_ITEM'
      || action.type === 'EXCHANGE_ALTER_FOR_VOLTS'
    ) {
      return 'economy-event';
    }
    return 'player-intent';
  }

  private dispatchViaEconomyService(action: ClientAction): DispatchResult {
    const registry = getPendingIntentRegistry();
    const intent = registry.register(action);

    const isLocalItemMutation =
      action.type === 'EQUIP_ITEM'
      || action.type === 'EQUIP_FROM_INVENTORY'
      || action.type === 'UNEQUIP_TO_INVENTORY';

    let localFailure: DispatchResult | null = null;

    getGameStore().performServerAction(intent.intentId, 'player-intent', () => {
      if (!isLocalItemMutation) return;

      const applied = this.applyItemMutationLocally(action);
      if (!applied.ok) {
        localFailure = applied;
        return;
      }
      getMutableDataStore().bumpRevision('inventory');
    });

    if (localFailure) {
      getGameStore().clearPendingAction(intent.intentId);
      registry.reject(intent.intentId);
      return localFailure;
    }

    if (!isLocalItemMutation) {
      this.intentTransport?.(intent);
    }

    this.economyService!.handleIntent(action, intent.intentId);
    return { ok: true, status: 'pending', intentId: intent.intentId };
  }

  private dispatchPending(action: ClientAction, optimisticFn?: () => void): DispatchResult {
    const registry = getPendingIntentRegistry();
    const intent = registry.register(action);
    const kind = this.resolvePendingKind(action);

    getGameStore().performServerAction(intent.intentId, kind, optimisticFn ?? (() => {}));

    if (this.mode === 'online' && !this.intentTransport) {
      getGameStore().clearPendingAction(intent.intentId);
      registry.reject(intent.intentId);
      return { ok: false, reason: 'Servidor indisponível. Reconecte e tente novamente.' };
    }

    if (!this.usesDedicatedWsTransport(action)) {
      this.intentTransport?.(intent);
    }
    registry.notifyTransport(intent);
    this.routePendingToTransport(action, intent.intentId);
    this.scheduleIntentTimeout(intent.intentId, action);
    return { ok: true, status: 'pending', intentId: intent.intentId };
  }

  private scheduleIntentTimeout(intentId: string, action: ClientAction): void {
    this.clearIntentTimeout(intentId);
    const handle = setTimeout(() => {
      this.intentTimeoutHandles.delete(intentId);
      const stillPending = getPendingIntentRegistry().isIntentPending(intentId);
      if (!stillPending) return;

      this.rejectIntent(intentId, undefined, { silent: true });
      console.warn('[ActionDispatcher] Intenção expirou sem confirmação do servidor.', {
        intentId,
        actionType: action.type,
      });
      this.notifyPendingIntentTimeout();
    }, this.pendingIntentTimeoutMs);
    this.intentTimeoutHandles.set(intentId, handle);
  }

  private notifyPendingIntentTimeout(): void {
    if (typeof document !== 'undefined') {
      alertSystem(PENDING_INTENT_TIMEOUT_MESSAGE);
      return;
    }
    console.warn(PENDING_INTENT_TIMEOUT_MESSAGE);
  }

  private clearIntentTimeout(intentId: string): void {
    const handle = this.intentTimeoutHandles.get(intentId);
    if (handle === undefined) return;
    clearTimeout(handle);
    this.intentTimeoutHandles.delete(intentId);
  }

  private routePendingToTransport(action: ClientAction, intentId: string): void {
    switch (action.type) {
      case 'EXCHANGE_ALTER_FOR_VOLTS':
        requestAlterToVoltsExchange(action.payload.alterAmount);
        break;
      case 'DEPOSIT_ITEM':
      case 'WITHDRAW_ITEM':
      case 'DEPOSIT_CURRENCY':
      case 'WITHDRAW_CURRENCY':
        if (!requestBankTransaction(action, intentId)) {
          getGameStore().clearPendingAction(intentId);
          getPendingIntentRegistry().reject(intentId);
          alertSystem('Servidor indisponível para operações bancárias.');
        }
        break;
      default:
        break;
    }
  }

  private dispatchLocal(action: ClientAction): DispatchResult {
    const dataStore = getMutableDataStore();

    switch (action.type) {
      case 'EXCHANGE_ALTER_FOR_VOLTS':
        requestAlterToVoltsExchange(action.payload.alterAmount);
        dataStore.bumpRevision('wallet');
        return { ok: true, status: 'applied' };

      case 'SELECT_MARCO_BRANCH': {
        const marcosStore = getPlayerMarcosStore();
        const branchCtx = marcosStore.getPlayerContext();
        if (!marcosStore.selectBranch(action.payload.starterNodeId)) {
          return {
            ok: false,
            reason:
              resolveMarcoChooseBlockedMessage(action.payload.starterNodeId, branchCtx) ??
              'Não foi possível escolher esta trilha.',
          };
        }
        dataStore.bumpRevision('marcosState');
        return { ok: true, status: 'applied' };
      }

      case 'CHOOSE_MARCO': {
        const marcosStore = getPlayerMarcosStore();
        const marcoCtx = marcosStore.getPlayerContext();
        if (!marcosStore.chooseMarco(action.payload.nodeId)) {
          return {
            ok: false,
            reason:
              resolveMarcoChooseBlockedMessage(action.payload.nodeId, marcoCtx) ??
              'Marco indisponível ou requisitos pendentes.',
          };
        }
        dataStore.bumpRevision('marcosState');
        return { ok: true, status: 'applied' };
      }

      case 'RESET_MARCO_TRAIL':
        if (!getPlayerMarcosStore().resetLockedTrail()) {
          return { ok: false, reason: 'Reset indisponível — fale com o Mestre de Trilhas.' };
        }
        dataStore.bumpRevision('marcosState');
        return { ok: true, status: 'applied' };

      case 'PROGRESS_MARCO':
        return { ok: false, reason: 'Progressão de Marcos requer validação do servidor.' };

      case 'DEPOSIT_ITEM':
      case 'WITHDRAW_ITEM':
      case 'DEPOSIT_CURRENCY':
      case 'WITHDRAW_CURRENCY':
        return { ok: false, reason: 'Operações bancárias requerem servidor ou mock economy.' };

      case 'EQUIP_ITEM': {
        const toggle = toggleItemSlot(action.payload.itemId, action.payload.slot);
        if (!toggle.ok) {
          return { ok: false, reason: toggle.reason };
        }
        dataStore.bumpRevision('inventory');
        return { ok: true, status: 'applied' };
      }

      case 'EQUIP_FROM_INVENTORY': {
        const equip = equipInventoryItemToSet(
          action.payload.itemId,
          action.payload.uiSlotId,
        );
        if (!equip.ok) {
          return { ok: false, reason: equipFromInventoryFailureMessage(equip.reason) };
        }
        dataStore.bumpRevision('inventory');
        return { ok: true, status: 'applied' };
      }

      case 'UNEQUIP_TO_INVENTORY': {
        const unequip = unequipSlotToInventory(action.payload.slotId);
        if (!unequip.ok) {
          return { ok: false, reason: unequipFailureMessage(unequip.reason) };
        }
        dataStore.bumpRevision('inventory');
        return { ok: true, status: 'applied' };
      }

      case 'PURCHASE_SKIN':
        if (!getPlayerSkinStore().purchaseById(action.payload.slot, action.payload.optionId)) {
          return { ok: false, reason: 'Compra não autorizada ou saldo insuficiente.' };
        }
        return { ok: true, status: 'applied' };

      case 'PURCHASE_NPC_ITEM':
        return { ok: false, reason: 'Compras na loja NPC requerem servidor ou mock economy.' };

      case 'PURCHASE_PET':
        return this.dispatchPurchasePet(
          action.payload.vendorId,
          action.payload.kindId,
          action.payload.name,
          action.payload.colorId,
          action.payload.gender,
        );

      case 'SELL_NPC_ITEM':
        return { ok: false, reason: 'Vendas na loja NPC requerem servidor ou mock economy.' };

      case 'HEAL_AT_NPC':
        return this.dispatchHealAtNpc(action.payload);

      case 'CAEL_BUY_PET_RATION': {
        const result = executeCaelBuyPetRation(action.payload.npcId);
        if (!result.ok) return { ok: false, reason: result.reason };
        alertSystem(result.message);
        return { ok: true, status: 'applied' };
      }

      case 'PET_FEED_SPECIAL_RATION': {
        const result = executePetFeedSpecialRation(action.payload.slotIndex);
        if (!result.ok) return { ok: false, reason: result.reason };
        alertSystem(result.message);
        return { ok: true, status: 'applied' };
      }

      case 'STAGE_BATTLE_LOOT':
      case 'COLLECT_BATTLE_LOOT':
      case 'DISMISS_BATTLE_LOOT':
        return { ok: false, reason: 'Saque de batalha requer servidor ou mock economy.' };

      case 'CREATE_MARKET_LISTING':
        return { ok: false, reason: 'Anúncios no Marketplace requerem servidor ou mock economy.' };
      case 'CREATE_MARKET_BUY_ORDER':
        return { ok: false, reason: 'Ordens de compra requerem servidor ou mock economy.' };
      case 'COLLECT_MARKET_VOLTS':
        return this.dispatchCollectMarketVolts(action.payload.listingId);
      case 'CANCEL_MARKET_LISTING':
        return this.dispatchCancelMarketListing(action.payload.listingId);
      case 'CANCEL_MARKET_BUY_ORDER':
        return this.dispatchCancelMarketBuyOrder(action.payload.orderId);

      case 'SYNC_LOADOUT':
        return { ok: false, reason: 'Sincronização de loadout requer servidor online.' };

      case 'MOVE_INTENT':
        return { ok: false, reason: 'Movimento de exploração usa dispatchMoveIntent no modo online.' };

      case 'ROTATE_INTENT':
        return { ok: false, reason: 'Pivot usa dispatchRotateIntent no modo online.' };

      case 'CRAFT_ITEM':
        return { ok: false, reason: 'Craft requer servidor online ou mock economy.' };

      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  }

  private dispatchHealAtNpc(payload: {
    readonly npcId: string;
    readonly clientVitals?: PlayerWorldVitals;
  }): DispatchResult {
    const equipment = getPlayerEquipmentStore().getSnapshot();
    const wallet = getPlayerWalletStore().getSnapshot();
    const clientVitals = payload.clientVitals ?? getGlobalPlayerStore().getWorldVitals();

    const result = healPlayer({
      npcId: payload.npcId,
      playerLevel: equipment.level,
      walletVolts: wallet.dollarVolt,
      vitals: clientVitals,
    });

    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    getPlayerWalletStore().applyBalances({
      dollarVolt: result.walletVolts,
      alterCoins: wallet.alterCoins,
    });

    getGlobalPlayerStore().applyWorldVitals(result.vitals);

    alertSystem(result.message);
    return { ok: true, status: 'applied' };
  }

  private dispatchPurchasePet(
    vendorId: string,
    kindId: PetKindId,
    name: string,
    colorId: PetColorId,
    gender: PetGenderId,
  ): DispatchResult {
    const wallet = getPlayerWalletStore().getSnapshot();
    const petStore = getPlayerPetStore();
    const validation = validatePetPurchase({
      vendorId,
      kindId,
      name,
      colorId,
      gender,
      walletVolts: wallet.dollarVolt,
      ownedPetCount: petStore.getRoster().pets.length,
    });
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    if (!getPlayerWalletStore().spendVolts(validation.quote.priceVolts)) {
      return { ok: false, reason: 'VOLTS insuficientes.' };
    }

    const adopted = buildAdoptedPet(validation.adoption);
    if (!petStore.adoptPet(adopted.kindId, {
      name: adopted.name,
      colorId: adopted.colorId,
      gender: adopted.gender,
    })) {
      getPlayerWalletStore().creditVolts(validation.quote.priceVolts);
      return { ok: false, reason: 'Não foi possível adicionar o companheiro ao roster.' };
    }

    return { ok: true, status: 'applied' };
  }

  private dispatchCollectMarketVolts(listingId: string): DispatchResult {
    const collectResult = getPlayerMarketStore().collectSoldListing(listingId);
    if (!collectResult.ok) {
      return { ok: false, reason: collectResult.reason };
    }

    getPlayerWalletStore().creditVolts(collectResult.volts);
    return { ok: true, status: 'applied' };
  }

  private dispatchCancelMarketListing(listingId: string): DispatchResult {
    const listings = getPlayerMarketStore().getListings();
    const target = listings.find((entry) => entry.id === listingId && entry.status === 'LISTED');
    if (!target) {
      return { ok: false, reason: 'Anúncio não encontrado ou já encerrado.' };
    }
    if (!getCarryCapacityStore().canAddItem(target.itemId, target.quantity)) {
      return { ok: false, reason: 'Inventário cheio — libere espaço antes de cancelar.' };
    }

    const cancelResult = getPlayerMarketStore().cancelListing(listingId);
    if (!cancelResult.ok) {
      return { ok: false, reason: cancelResult.reason };
    }

    getPlayerInventoryStore().addItem(cancelResult.itemId, cancelResult.quantity);
    getMutableDataStore().bumpRevision('inventory');
    alertSystem(`Oferta de venda cancelada: ${cancelResult.quantity}× ${cancelResult.itemName} devolvido(s).`);
    return { ok: true, status: 'applied' };
  }

  private dispatchCancelMarketBuyOrder(orderId: string): DispatchResult {
    const cancelResult = getMarketplaceBuyOrderStore().cancelOrder(orderId);
    if (!cancelResult.ok) {
      return { ok: false, reason: cancelResult.reason };
    }

    getPlayerWalletStore().creditVolts(cancelResult.refundVolts);
    alertSystem(`Ordem de compra cancelada: ${formatVolts(cancelResult.refundVolts)} devolvidos.`);
    return { ok: true, status: 'applied' };
  }
}

let activeDispatcher: ActionDispatcher | null = null;

export function initActionDispatcher(): void {
  if (!activeDispatcher) activeDispatcher = new ActionDispatcher();
}

export function getActionDispatcher(): ActionDispatcher {
  if (!activeDispatcher) initActionDispatcher();
  return activeDispatcher!;
}

export function resetActionDispatcher(): void {
  activeDispatcher = null;
  resetPendingIntentRegistry();
  resetPendingActionsStore();
  resetUIIntentStore();
}
