import { useMemo, useState } from 'react';
import { CRAFT_STATION_FERREIRO } from '../../../shared/crafting/craftRecipes.js';
import {
  inventorySnapshotToCraftRows,
  listCraftRecipesForStation,
  resolveMaxCraftBatches,
  type CraftRecipe,
} from '../../../shared/crafting/craftValidation.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';
import { usePlayerData } from '../store/gameStore.js';

export type CraftStationView = {
  readonly craftStationId: string;
  readonly stationName: string;
};

export function resolveCraftStationFromContext(context: WorldPanelContext): CraftStationView {
  if (context.kind === 'craftStation') {
    return {
      craftStationId: context.craftStationId,
      stationName: context.stationName,
    };
  }
  return {
    craftStationId: CRAFT_STATION_FERREIRO,
    stationName: 'Ferreiro',
  };
}

export function useCraftPanelState(station: CraftStationView) {
  const { inventory } = usePlayerData();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [craftQuantity, setCraftQuantity] = useState(1);

  const inventoryRows = useMemo(
    () => inventorySnapshotToCraftRows(inventory),
    [inventory],
  );

  const recipes = useMemo(
    () => listCraftRecipesForStation(station.craftStationId),
    [station.craftStationId],
  );

  const selectedRecipe = useMemo((): CraftRecipe | null => {
    if (!selectedRecipeId) return null;
    return recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null;
  }, [recipes, selectedRecipeId]);

  const maxBatches = useMemo(() => {
    if (!selectedRecipe) return 0;
    return resolveMaxCraftBatches(selectedRecipe, inventoryRows);
  }, [inventoryRows, selectedRecipe]);

  const clampedQuantity = Math.min(
    craftQuantity,
    Math.max(1, maxBatches || 1),
  );

  const selectRecipe = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setCraftQuantity(1);
  };

  const resetAfterCraft = () => {
    setCraftQuantity(1);
  };

  const countInventoryItem = (itemId: string): number => {
    return inventoryRows.find((row) => row.itemId === itemId)?.quantity ?? 0;
  };

  return {
    recipes,
    selectedRecipe,
    selectedRecipeId,
    craftQuantity: clampedQuantity,
    maxBatches,
    inventoryRows,
    selectRecipe,
    setCraftQuantity: (qty: number) => setCraftQuantity(Math.max(1, Math.floor(qty))),
    resetAfterCraft,
    countInventoryItem,
  };
}
