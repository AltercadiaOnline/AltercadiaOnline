import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { stacksToInventorySlotsWithStacking } from '../../../shared/character/inventoryStackOps.js';
import type { InventorySlotState } from '../../../shared/character/inventorySlots.js';
import type { BankStorageDataSnapshot } from '../../../shared/playerDataSnapshots.js';
import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';
import {
  BANK_HUD_GRID_COLUMNS,
  BANK_HUD_GRID_ROWS,
  BANK_ITEM_SLOT_CAPACITY,
  BankCurrencyType,
} from '../../../shared/bank/bankConstants.js';
import { normalizeBankCurrencyAmount } from '../../../shared/bank/bankCurrencyRules.js';
import {
  clampBankVaultPageIndex,
  sliceBankVaultPageSlots,
  BANK_VAULT_PAGE_SLOT_COUNT,
} from '../../../shared/bank/bankVaultPagination.js';
import { emitItemTooltip } from '../../ui/tooltip/emitItemTooltip.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPendingIntentRegistry } from '../../sync/pendingIntentRegistry.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import {
  resolveInventoryItemAbbrev,
  resolveInventoryItemKindClass,
  resolveInventoryItemLabel,
} from '../../ui/inventory/inventoryItemDisplay.js';

export type BankTab = 'items' | 'currency';
export type ItemSource = 'inventory' | 'bank';
export type FlowDirection = 'to-vault' | 'to-inventory';

export type StagedTransfer = {
  readonly source: ItemSource;
  readonly slotIndex: number;
  readonly itemId: string;
  readonly maxQuantity: number;
};

const FLOW_ANIMATION_MS = 720;

function isCurrencyItem(itemId: string): boolean {
  return itemId === 'dollar_volt' || itemId === 'gold';
}

function resolveStagedTransfer(
  staged: StagedTransfer | null,
  inventorySlots: readonly InventorySlotState[],
  bankStorage: BankStorageDataSnapshot,
): StagedTransfer | null {
  if (!staged) return null;

  if (staged.source === 'inventory') {
    const slot = inventorySlots[staged.slotIndex];
    if (!slot?.itemId || slot.quantity <= 0) return null;
    if (slot.itemId !== staged.itemId) return null;
    if (isCurrencyItem(slot.itemId)) return null;
    if ((slot.lockedQuantity ?? 0) > 0) return null;
    return { ...staged, maxQuantity: slot.quantity };
  }

  const vaultSlots = stacksToInventorySlotsWithStacking(
    bankStorage.itemStacks,
    BANK_ITEM_SLOT_CAPACITY,
  );
  const slot = vaultSlots[staged.slotIndex];
  if (!slot?.itemId || slot.quantity <= 0) return null;
  if (slot.itemId !== staged.itemId) return null;
  if (isCurrencyItem(slot.itemId)) return null;
  return { ...staged, maxQuantity: slot.quantity };
}

export function useBankPanelState() {
  const dispatcher = getActionDispatcher();
  const dataStore = getDataStore();

  const [activeTab, setActiveTab] = useState<BankTab>('items');
  const [vaultPage, setVaultPage] = useState(0);
  const [stagedTransfer, setStagedTransfer] = useState<StagedTransfer | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [pendingFlow, setPendingFlow] = useState<FlowDirection | null>(null);
  const [voltsInput, setVoltsInput] = useState('');
  const [alterInput, setAlterInput] = useState('');

  const [wallet, setWallet] = useState<WalletSnapshot>(() => dataStore.getWallet());
  const [inventory, setInventory] = useState(() => dataStore.getInventory());
  const [bankStorage, setBankStorage] = useState<BankStorageDataSnapshot>(
    () => dataStore.getBankStorage(),
  );

  const flowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inFlight = pendingFlow !== null || getPendingIntentRegistry().hasPendingBankTransaction();

  const clearPendingTransfer = useCallback(() => {
    if (flowTimerRef.current) {
      clearTimeout(flowTimerRef.current);
      flowTimerRef.current = null;
    }
    setPendingFlow(null);
    setStagedTransfer(null);
    setItemQuantity(1);
  }, []);

  const scheduleFlowClear = useCallback(() => {
    if (flowTimerRef.current) clearTimeout(flowTimerRef.current);
    flowTimerRef.current = setTimeout(() => {
      clearPendingTransfer();
    }, FLOW_ANIMATION_MS);
  }, [clearPendingTransfer]);

  useEffect(() => {
    const unsubWallet = dataStore.subscribe('wallet', setWallet);
    const unsubInventory = dataStore.subscribe('inventory', setInventory);
    const unsubBank = dataStore.subscribe('bankStorage', (bank) => {
      setBankStorage(bank);
      setVaultPage((page) => clampBankVaultPageIndex(page, bank.itemCapacity));
    });

    const onBankTxConfirmed = (): void => {
      clearPendingTransfer();
      setWallet(dataStore.getWallet());
      setInventory(dataStore.getInventory());
      setBankStorage(dataStore.getBankStorage());
    };

    const unsubSuccess = uiEvents.on(UIEventType.BANK_UPDATE_SUCCESS, onBankTxConfirmed);
    const unsubFail = uiEvents.on(UIEventType.BANK_TRANSACTION_FAILED, () => {
      clearPendingTransfer();
    });
    const unsubBalance = uiEvents.on(UIEventType.BANK_BALANCE_UPDATED, (payload) => {
      setBankStorage((prev: BankStorageDataSnapshot) => ({
        ...prev,
        currencies: {
          dollarVolt: payload.dollarVolt,
          alterCoins: payload.alterCoins,
        },
        voltsFormatted: payload.voltsFormatted,
        alterFormatted: payload.alterFormatted,
        ...(payload.revision !== undefined ? { revision: payload.revision } : {}),
      }));
    });

    return () => {
      unsubWallet();
      unsubInventory();
      unsubBank();
      unsubSuccess();
      unsubFail();
      unsubBalance();
      if (flowTimerRef.current) clearTimeout(flowTimerRef.current);
    };
  }, [clearPendingTransfer, dataStore]);

  const resolvedStaged = useMemo(
    () => resolveStagedTransfer(stagedTransfer, inventory.slots, bankStorage),
    [stagedTransfer, inventory.slots, bankStorage],
  );

  const vaultSlice = useMemo(() => {
    const allVaultSlots = stacksToInventorySlotsWithStacking(
      bankStorage.itemStacks,
      BANK_ITEM_SLOT_CAPACITY,
    );
    return sliceBankVaultPageSlots(allVaultSlots, vaultPage, bankStorage.itemCapacity);
  }, [bankStorage.itemStacks, bankStorage.itemCapacity, vaultPage]);

  const clampQuantity = useCallback((qty: number, staged: StagedTransfer | null): number => {
    if (!staged) return 1;
    return Math.max(1, Math.min(qty, staged.maxQuantity));
  }, []);

  const stageItemFromSlot = useCallback((source: ItemSource, slotIndex: number) => {
    if (inFlight) return;

    if (source === 'inventory') {
      const slot = inventory.slots[slotIndex];
      if (!slot?.itemId || slot.quantity <= 0) return;
      if (isCurrencyItem(slot.itemId)) return;
      if ((slot.lockedQuantity ?? 0) > 0) {
        alertSystem('Item bloqueado — aguarde a transação bancária anterior.');
        return;
      }
      if (
        stagedTransfer?.source === source
        && stagedTransfer.slotIndex === slotIndex
      ) {
        setStagedTransfer(null);
        setItemQuantity(1);
        return;
      }
      setStagedTransfer({
        source,
        slotIndex,
        itemId: slot.itemId,
        maxQuantity: slot.quantity,
      });
      setItemQuantity(1);
      return;
    }

    const vaultSlots = stacksToInventorySlotsWithStacking(
      bankStorage.itemStacks,
      BANK_ITEM_SLOT_CAPACITY,
    );
    const slot = vaultSlots[slotIndex];
    if (!slot?.itemId || slot.quantity <= 0) return;
    if (isCurrencyItem(slot.itemId)) return;
    if (
      stagedTransfer?.source === source
      && stagedTransfer.slotIndex === slotIndex
    ) {
      setStagedTransfer(null);
      setItemQuantity(1);
      return;
    }
    setStagedTransfer({
      source,
      slotIndex,
      itemId: slot.itemId,
      maxQuantity: slot.quantity,
    });
    setItemQuantity(1);
  }, [bankStorage.itemStacks, inFlight, inventory.slots, stagedTransfer]);

  const setVaultPageSafe = useCallback((pageIndex: number) => {
    const nextPage = clampBankVaultPageIndex(pageIndex, bankStorage.itemCapacity);
    setVaultPage(nextPage);
    setStagedTransfer((staged) => {
      if (!staged || staged.source !== 'bank') return staged;
      const pageStart = nextPage * BANK_VAULT_PAGE_SLOT_COUNT;
      const pageEnd = pageStart + BANK_VAULT_PAGE_SLOT_COUNT;
      if (staged.slotIndex < pageStart || staged.slotIndex >= pageEnd) {
        return null;
      }
      return staged;
    });
  }, [bankStorage.itemCapacity]);

  const dispatchItem = useCallback((
    type: 'DEPOSIT_ITEM' | 'WITHDRAW_ITEM',
    itemId: string,
    flow: FlowDirection,
  ) => {
    if (!itemId || inFlight) return;

    const result = dispatcher.dispatch({
      type,
      payload: { itemId, quantity: itemQuantity },
    });
    if (!result.ok) {
      alertSystem(result.reason);
      return;
    }
    if (result.status === 'applied' || result.status === 'pending') {
      setPendingFlow(flow);
      if (result.status === 'applied') {
        scheduleFlowClear();
      }
    }
  }, [dispatcher, inFlight, itemQuantity, scheduleFlowClear]);

  const confirmDeposit = useCallback(() => {
    if (resolvedStaged?.source === 'inventory') {
      dispatchItem('DEPOSIT_ITEM', resolvedStaged.itemId, 'to-vault');
    }
  }, [dispatchItem, resolvedStaged]);

  const confirmWithdraw = useCallback(() => {
    if (resolvedStaged?.source === 'bank') {
      dispatchItem('WITHDRAW_ITEM', resolvedStaged.itemId, 'to-inventory');
    }
  }, [dispatchItem, resolvedStaged]);

  const dispatchCurrency = useCallback((
    type: 'DEPOSIT_CURRENCY' | 'WITHDRAW_CURRENCY',
    currency: typeof BankCurrencyType.Volts | typeof BankCurrencyType.Alter,
    rawAmount: string,
  ) => {
    if (inFlight) {
      alertSystem('Aguarde a conclusão da transação bancária anterior.');
      return;
    }

    const amount = normalizeBankCurrencyAmount(Number(rawAmount));
    if (amount === null) {
      alertSystem('Informe um valor inteiro positivo.');
      return;
    }

    const result = dispatcher.dispatch({ type, payload: { currency, amount } });
    if (!result.ok) {
      alertSystem(result.reason);
      return;
    }

    if (currency === BankCurrencyType.Volts) {
      setVoltsInput('');
    } else {
      setAlterInput('');
    }
  }, [dispatcher, inFlight]);

  const updateItemQuantity = useCallback((raw: string) => {
    const next = Math.max(1, Math.floor(Number(raw) || 1));
    setItemQuantity(clampQuantity(next, resolvedStaged));
  }, [clampQuantity, resolvedStaged]);

  const flowClass = pendingFlow === 'to-vault'
    ? 'is-flow-to-vault'
    : pendingFlow === 'to-inventory'
      ? 'is-flow-to-inventory'
      : '';

  const bridgeMeta = useMemo(() => {
    if (!resolvedStaged) {
      return {
        label: 'Clique em um item',
        direction: 'Ponte',
        abbrev: '—',
        kindClass: '',
        confirmLabel: 'Confirmar',
        isDeposit: false,
      };
    }
    const isDeposit = resolvedStaged.source === 'inventory';
    return {
      label: resolveInventoryItemLabel(resolvedStaged.itemId),
      direction: isDeposit ? '→ Cofre' : '← Inventário',
      abbrev: resolveInventoryItemAbbrev(resolvedStaged.itemId),
      kindClass: resolveInventoryItemKindClass(resolvedStaged.itemId),
      confirmLabel: isDeposit ? 'Confirmar depósito' : 'Confirmar saque',
      isDeposit,
    };
  }, [resolvedStaged]);

  const showItemTooltip = useCallback((event: React.MouseEvent, itemId: string) => {
    emitItemTooltip(itemId, event.clientX, event.clientY);
  }, []);

  const hideTooltip = useCallback(() => {
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }, []);

  useEffect(() => () => {
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }, []);

  return {
    activeTab,
    setActiveTab,
    wallet,
    inventory,
    bankStorage,
    vaultSlice,
    vaultPage,
    setVaultPage: setVaultPageSafe,
    resolvedStaged,
    itemQuantity,
    updateItemQuantity,
    inFlight,
    flowClass,
    bridgeMeta,
    stageItemFromSlot,
    clearStaged: () => {
      setStagedTransfer(null);
      setItemQuantity(1);
    },
    confirmDeposit,
    confirmWithdraw,
    voltsInput,
    setVoltsInput,
    alterInput,
    setAlterInput,
    dispatchCurrency,
    showItemTooltip,
    hideTooltip,
    gridColumns: BANK_HUD_GRID_COLUMNS,
    gridRows: BANK_HUD_GRID_ROWS,
  };
}
