// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState, } from 'react';
import { BankCurrencyType } from '../../../shared/bank/bankConstants.js';
import { normalizeBankCurrencyAmount } from '../../../shared/bank/bankCurrencyRules.js';
import { clampBankVaultPageIndex } from '../../../shared/bank/bankVaultPagination.js';
import { getItemById } from '../../../shared/items/itemCatalog.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPendingIntentRegistry } from '../../sync/pendingIntentRegistry.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { clampBankItemQuantity, notifyStageAlert, resolveFlowDirectionForItemAction, resolveStagedTransfer, stageItemFromSlot, } from '../../ui/bank/bankPanelLogic.js';
import { buildBankPanelBodyHtml, shouldClearStagedOnVaultPageChange, } from '../../ui/bank/renderBankPanelView.js';
import { closeHudWindow } from './panelWindowActions.js';
const FLOW_ANIMATION_MS = 720;
export function useBankPanel(enabled) {
    const [wallet, setWallet] = useState(() => getDataStore().getWallet());
    const [inventory, setInventory] = useState(() => getDataStore().getInventory());
    const [bankStorage, setBankStorage] = useState(() => getDataStore().getBankStorage());
    const [activeTab, setActiveTab] = useState('items');
    const [stagedTransfer, setStagedTransfer] = useState(null);
    const [vaultCurrentPage, setVaultCurrentPage] = useState(0);
    const [itemQuantity, setItemQuantity] = useState(1);
    const [pendingFlow, setPendingFlow] = useState(null);
    const [renderTick, setRenderTick] = useState(0);
    const bodyRef = useRef(null);
    const flowClearTimerRef = useRef(null);
    const inFlight = pendingFlow !== null || getPendingIntentRegistry().hasPendingBankTransaction();
    const resolvedStaged = useMemo(() => resolveStagedTransfer(stagedTransfer, inventory, bankStorage), [bankStorage, inventory, stagedTransfer]);
    const clampedQuantity = useMemo(() => clampBankItemQuantity(stagedTransfer, inventory, bankStorage, itemQuantity), [bankStorage, inventory, itemQuantity, stagedTransfer]);
    const bodyRender = useMemo(() => buildBankPanelBodyHtml({
        wallet,
        inventory,
        bankStorage,
        activeTab,
        stagedTransfer: resolvedStaged,
        vaultCurrentPage,
        itemQuantity: clampedQuantity,
        pendingFlow,
        inFlight,
    }), [
        activeTab,
        bankStorage,
        clampedQuantity,
        inFlight,
        inventory,
        pendingFlow,
        renderTick,
        resolvedStaged,
        vaultCurrentPage,
        wallet,
    ]);
    const bodyHtml = bodyRender.html;
    useEffect(() => {
        if (bodyRender.vaultPageIndex !== vaultCurrentPage) {
            setVaultCurrentPage(bodyRender.vaultPageIndex);
        }
    }, [bodyRender.vaultPageIndex, vaultCurrentPage]);
    const clearPendingTransfer = useCallback(() => {
        if (flowClearTimerRef.current) {
            clearTimeout(flowClearTimerRef.current);
            flowClearTimerRef.current = null;
        }
        setPendingFlow(null);
        setStagedTransfer(null);
        setItemQuantity(1);
    }, []);
    const scheduleFlowClear = useCallback(() => {
        if (flowClearTimerRef.current)
            clearTimeout(flowClearTimerRef.current);
        flowClearTimerRef.current = setTimeout(() => {
            clearPendingTransfer();
            setRenderTick((tick) => tick + 1);
        }, FLOW_ANIMATION_MS);
    }, [clearPendingTransfer]);
    const setVaultPage = useCallback((pageIndex) => {
        const nextPage = clampBankVaultPageIndex(pageIndex, bankStorage.itemCapacity);
        setVaultCurrentPage(nextPage);
        if (shouldClearStagedOnVaultPageChange(stagedTransfer, nextPage)) {
            setStagedTransfer(null);
            setItemQuantity(1);
        }
    }, [bankStorage.itemCapacity, stagedTransfer]);
    useEffect(() => {
        if (!enabled)
            return;
        const store = getDataStore();
        setWallet(store.getWallet());
        setInventory(store.getInventory());
        setBankStorage(store.getBankStorage());
        const unsubWallet = store.subscribe('wallet', setWallet);
        const unsubInventory = store.subscribe('inventory', setInventory);
        const unsubBank = store.subscribe('bankStorage', (bank) => {
            setBankStorage(bank);
            setVaultCurrentPage((page) => clampBankVaultPageIndex(page, bank.itemCapacity));
        });
        const onBankTxConfirmed = () => {
            clearPendingTransfer();
            setWallet(store.getWallet());
            setInventory(store.getInventory());
            setBankStorage(store.getBankStorage());
            setRenderTick((tick) => tick + 1);
        };
        const unsubBankSuccess = uiEvents.on(UIEventType.BANK_UPDATE_SUCCESS, onBankTxConfirmed);
        const unsubBankFail = uiEvents.on(UIEventType.BANK_TRANSACTION_FAILED, () => {
            clearPendingTransfer();
            setRenderTick((tick) => tick + 1);
        });
        const unsubBankBalance = uiEvents.on(UIEventType.BANK_BALANCE_UPDATED, (payload) => {
            setBankStorage((current) => ({
                ...current,
                currencies: {
                    dollarVolt: payload.dollarVolt,
                    alterCoins: payload.alterCoins,
                },
                voltsFormatted: payload.voltsFormatted,
                alterFormatted: payload.alterFormatted,
                ...(payload.revision !== undefined ? { revision: payload.revision } : {}),
            }));
        });
        const unsubPending = getPendingIntentRegistry().subscribeChange(() => {
            setRenderTick((tick) => tick + 1);
        });
        return () => {
            unsubWallet();
            unsubInventory();
            unsubBank();
            unsubBankSuccess();
            unsubBankFail();
            unsubBankBalance();
            unsubPending();
        };
    }, [clearPendingTransfer, enabled]);
    useEffect(() => {
        if (!enabled)
            return;
        return () => {
            if (flowClearTimerRef.current) {
                clearTimeout(flowClearTimerRef.current);
                flowClearTimerRef.current = null;
            }
            uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
        };
    }, [enabled]);
    useEffect(() => {
        if (!enabled || activeTab !== 'items')
            return;
        const root = bodyRef.current;
        if (!root)
            return;
        const cleanups = [];
        for (const slot of root.querySelectorAll('[data-item-id]')) {
            const onEnter = (event) => {
                const itemId = slot.dataset.itemId;
                if (!itemId)
                    return;
                const item = getItemById(itemId);
                if (!item)
                    return;
                uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
                    data: { kind: 'item', data: item },
                    x: event.clientX,
                    y: event.clientY,
                });
            };
            const onLeave = () => {
                uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
            };
            slot.addEventListener('mouseenter', onEnter);
            slot.addEventListener('mouseleave', onLeave);
            cleanups.push(() => {
                slot.removeEventListener('mouseenter', onEnter);
                slot.removeEventListener('mouseleave', onLeave);
            });
        }
        return () => {
            for (const off of cleanups)
                off();
            uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
        };
    }, [activeTab, bodyHtml, enabled]);
    const dispatchItem = useCallback((type, itemId) => {
        if (!itemId || pendingFlow !== null || getPendingIntentRegistry().hasPendingBankTransaction())
            return;
        const result = getActionDispatcher().dispatch({
            type,
            payload: { itemId, quantity: clampedQuantity },
        });
        if (!result.ok) {
            alertSystem(result.reason);
            return;
        }
        if (result.status === 'applied' || result.status === 'pending') {
            setPendingFlow(resolveFlowDirectionForItemAction(type));
            setRenderTick((tick) => tick + 1);
            if (result.status === 'applied') {
                scheduleFlowClear();
            }
        }
    }, [clampedQuantity, pendingFlow, scheduleFlowClear]);
    const dispatchCurrency = useCallback((type, currency) => {
        if (pendingFlow !== null || getPendingIntentRegistry().hasPendingBankTransaction()) {
            alertSystem('Aguarde a conclusão da transação bancária anterior.');
            return;
        }
        const input = bodyRef.current?.querySelector(`[data-currency-input="${currency}"]`);
        const amount = normalizeBankCurrencyAmount(Number(input?.value ?? 0));
        if (amount === null) {
            alertSystem('Informe um valor inteiro positivo.');
            return;
        }
        const result = getActionDispatcher().dispatch({ type, payload: { currency, amount } });
        if (!result.ok) {
            alertSystem(result.reason);
            return;
        }
        if (input)
            input.value = '';
        if (result.status === 'pending') {
            setRenderTick((tick) => tick + 1);
        }
    }, [pendingFlow]);
    const handleClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        const actionEl = target.closest('[data-action]');
        const action = actionEl?.dataset.action;
        if (action === 'close') {
            closeHudWindow('bank');
            return;
        }
        const tabEl = target.closest('[data-tab]');
        const tab = tabEl?.dataset.tab;
        if (tab === 'items' || tab === 'currency') {
            setActiveTab(tab);
            return;
        }
        if (action === 'vault-prev') {
            setVaultPage(vaultCurrentPage - 1);
            return;
        }
        if (action === 'vault-next') {
            setVaultPage(vaultCurrentPage + 1);
            return;
        }
        const vaultPageBtn = target.closest('[data-vault-page]');
        if (vaultPageBtn?.dataset.vaultPage !== undefined) {
            setVaultPage(Number(vaultPageBtn.dataset.vaultPage));
            return;
        }
        const slotBtn = target.closest('[data-bank-select-slot]');
        if (slotBtn) {
            if (pendingFlow !== null || getPendingIntentRegistry().hasPendingBankTransaction())
                return;
            const slotIndex = Number(slotBtn.dataset.bankSelectSlot);
            const source = slotBtn.dataset.itemSource;
            if (!Number.isFinite(slotIndex) || !source)
                return;
            const result = stageItemFromSlot(source, slotIndex, stagedTransfer, inventory, bankStorage);
            notifyStageAlert(result);
            if (result.kind === 'noop')
                return;
            if (result.kind === 'clear') {
                setStagedTransfer(null);
                setItemQuantity(1);
                return;
            }
            if (result.kind === 'stage') {
                setStagedTransfer(result.stagedTransfer);
                setItemQuantity(result.itemQuantity);
            }
            return;
        }
        if (action === 'clear-staged') {
            setStagedTransfer(null);
            setItemQuantity(1);
            return;
        }
        if (action === 'confirm-deposit') {
            const staged = resolveStagedTransfer(stagedTransfer, inventory, bankStorage);
            if (staged?.source === 'inventory') {
                dispatchItem('DEPOSIT_ITEM', staged.itemId);
            }
            return;
        }
        if (action === 'confirm-withdraw') {
            const staged = resolveStagedTransfer(stagedTransfer, inventory, bankStorage);
            if (staged?.source === 'bank') {
                dispatchItem('WITHDRAW_ITEM', staged.itemId);
            }
            return;
        }
        if (action === 'deposit-volts') {
            dispatchCurrency('DEPOSIT_CURRENCY', BankCurrencyType.Volts);
            return;
        }
        if (action === 'withdraw-volts') {
            dispatchCurrency('WITHDRAW_CURRENCY', BankCurrencyType.Volts);
            return;
        }
        if (action === 'deposit-alter') {
            dispatchCurrency('DEPOSIT_CURRENCY', BankCurrencyType.Alter);
            return;
        }
        if (action === 'withdraw-alter') {
            dispatchCurrency('WITHDRAW_CURRENCY', BankCurrencyType.Alter);
        }
    }, [
        bankStorage,
        dispatchCurrency,
        dispatchItem,
        inventory,
        pendingFlow,
        setVaultPage,
        stagedTransfer,
        vaultCurrentPage,
    ]);
    const handleChange = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement))
            return;
        if (!target.matches('[data-qty-input]'))
            return;
        const next = clampBankItemQuantity(stagedTransfer, inventory, bankStorage, Math.max(1, Math.floor(Number(target.value) || 1)));
        setItemQuantity(next);
        if (String(next) !== target.value) {
            target.value = String(next);
        }
    }, [bankStorage, inventory, stagedTransfer]);
    return {
        bodyHtml,
        bodyRef,
        handleClick,
        handleChange,
    };
}
