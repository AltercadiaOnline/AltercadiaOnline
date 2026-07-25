// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { inventorySnapshotToCraftRows, listCraftRecipesForStation, resolveMaxCraftBatches, } from '../../../shared/crafting/craftValidation.js';
import { CRAFT_STATION_FERREIRO } from '../../../shared/crafting/craftRecipes.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { resolveInventoryItemLabel } from '../../ui/inventory/inventoryItemDisplay.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { ActionGatewayButtonController, } from '../../ui/components/ActionGatewayButton.js';
import { getNpcPanelContextBridge } from '../bridge/npcPanelContextBridge.js';
const DEFAULT_STATION = {
    craftStationId: CRAFT_STATION_FERREIRO,
    stationName: 'Ferreiro',
};
export function useCraftPanel(enabled) {
    const [station, setStation] = useState(DEFAULT_STATION);
    const [inventory, setInventory] = useState(() => getDataStore().getInventory());
    const [selectedRecipeId, setSelectedRecipeId] = useState(null);
    const [craftQuantity, setCraftQuantityState] = useState(1);
    const [gatewayTick, setGatewayTick] = useState(0);
    const craftButtonRef = useRef(null);
    const craftGatewayRef = useRef(null);
    const recipes = useMemo(() => listCraftRecipesForStation(station.craftStationId), [station.craftStationId]);
    const craftRows = useMemo(() => inventorySnapshotToCraftRows(inventory), [inventory]);
    const selectedRecipe = useMemo(() => (selectedRecipeId ? recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null : null), [recipes, selectedRecipeId]);
    const maxBatches = useMemo(() => (selectedRecipe ? resolveMaxCraftBatches(selectedRecipe, craftRows) : 0), [craftRows, selectedRecipe]);
    const countInventoryItem = (itemId) => {
        return craftRows.find((row) => row.itemId === itemId)?.quantity ?? 0;
    };
    useEffect(() => {
        if (!enabled)
            return;
        return getNpcPanelContextBridge().subscribe((snapshot) => {
            if (snapshot.craftStation) {
                setStation({ ...snapshot.craftStation });
                setSelectedRecipeId(null);
                setCraftQuantityState(1);
            }
        });
    }, [enabled]);
    useEffect(() => {
        if (!enabled)
            return;
        setInventory(getDataStore().getInventory());
        return getDataStore().subscribe('inventory', setInventory);
    }, [enabled]);
    const selectRecipe = (recipeId) => {
        setSelectedRecipeId(recipeId);
        setCraftQuantityState(1);
    };
    const setCraftQuantity = (quantity) => {
        const next = Math.max(1, Math.floor(quantity));
        if (selectedRecipe) {
            const max = resolveMaxCraftBatches(selectedRecipe, craftRows);
            setCraftQuantityState(max > 0 ? Math.min(next, max) : next);
            return;
        }
        setCraftQuantityState(next);
    };
    useEffect(() => {
        if (!enabled)
            return;
        const buildOptions = () => ({
            pendingLabel: 'Forjando…',
            relatedElements: () => (craftButtonRef.current ? [] : []),
            onClick: () => {
                if (!selectedRecipeId)
                    return;
                const qtyInput = document.querySelector('[data-craft-qty]');
                const quantity = qtyInput
                    ? Math.max(1, Math.floor(Number(qtyInput.value) || 1))
                    : craftQuantity;
                const result = getActionDispatcher().dispatch({
                    type: 'CRAFT_ITEM',
                    payload: {
                        craftStationId: station.craftStationId,
                        recipeId: selectedRecipeId,
                        quantity,
                    },
                });
                if (!result.ok) {
                    alertSystem(result.reason);
                    return;
                }
                if (result.status === 'applied') {
                    setCraftQuantityState(1);
                }
                setGatewayTick((tick) => tick + 1);
                return result;
            },
            onResolved: () => {
                setCraftQuantityState(1);
                setGatewayTick((tick) => tick + 1);
            },
        });
        const controller = new ActionGatewayButtonController(buildOptions);
        craftGatewayRef.current = controller;
        controller.attach(craftButtonRef.current);
        return () => controller.destroy();
    }, [
        enabled,
        station.craftStationId,
        selectedRecipeId,
        craftQuantity,
        gatewayTick,
    ]);
    return {
        station,
        recipes,
        selectedRecipe,
        selectedRecipeId,
        craftQuantity: maxBatches > 0 ? Math.min(craftQuantity, maxBatches) : craftQuantity,
        maxBatches,
        selectRecipe,
        setCraftQuantity,
        countInventoryItem,
        resolveOutputLabel: resolveInventoryItemLabel,
        getRecipeMaxBatches: (recipe) => resolveMaxCraftBatches(recipe, craftRows),
        craftButtonRef,
        craftBusyAttrs: craftGatewayRef.current?.busyAttrs() ?? '',
    };
}
