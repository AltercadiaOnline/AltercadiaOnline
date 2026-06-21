import { useCallback, useMemo } from 'react';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import { resolveInventoryItemLabel } from '../../../../ui/inventory/inventoryItemDisplay.js';
import { resolveMaxCraftBatches } from '../../../../../shared/crafting/craftValidation.js';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useActionGatewaySubmit } from '../../../panels/useActionGatewaySubmit.js';
import {
  resolveCraftStationFromContext,
  useCraftPanelState,
} from '../../../panels/useCraftPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldCraftPanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

export function WorldCraftPanel({ context, zIndex, focused }: WorldCraftPanelProps) {
  const station = useMemo(() => resolveCraftStationFromContext(context), [context]);
  const {
    recipes,
    selectedRecipe,
    craftQuantity,
    maxBatches,
    inventoryRows,
    selectRecipe,
    setCraftQuantity,
    resetAfterCraft,
    countInventoryItem,
  } = useCraftPanelState(station);

  const handleCraft = useCallback(() => {
    if (!selectedRecipe) return undefined;

    return getActionDispatcher().dispatch({
      type: 'CRAFT_ITEM',
      payload: {
        craftStationId: station.craftStationId,
        recipeId: selectedRecipe.id,
        quantity: craftQuantity,
      },
    });
  }, [craftQuantity, selectedRecipe, station.craftStationId]);

  const { submit, pending, buttonLabel } = useActionGatewaySubmit({
    onClick: handleCraft,
    onResolved: resetAfterCraft,
    pendingLabel: 'Forjando…',
    idleLabel: 'Forjar item',
  });

  const canCraft = maxBatches > 0 && Boolean(selectedRecipe);

  return (
    <MovablePanelFrame
      windowId="craft"
      title={station.stationName}
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--craft ui-panel--craft"
      panelStyle={{ width: 'min(560px, 96vw)' }}
      onFocus={() => tryFocusReactWorldPanel('craft')}
      onClose={() => tryCloseReactWorldPanel('craft')}
    >
      <div className="craft-panel">
        <p className="vendor-shop__tag mb-2">OFICINA // CRAFT</p>

        <div className="craft-panel__body">
          <section className="craft-panel__recipes" aria-label="Receitas">
            {recipes.length === 0 ? (
              <p className="ui-empty text-sm text-white/55">Nenhuma receita nesta estação.</p>
            ) : (
              recipes.map((recipe) => {
                const batches = resolveMaxCraftBatches(recipe, inventoryRows);
                const canMake = batches > 0;
                const isSelected = selectedRecipe?.id === recipe.id;

                return (
                  <button
                    key={recipe.id}
                    type="button"
                    className={[
                      'craft-panel__recipe',
                      isSelected ? 'craft-panel__recipe--selected' : '',
                      canMake ? '' : 'craft-panel__recipe--blocked',
                    ].filter(Boolean).join(' ')}
                    disabled={!canMake}
                    onClick={() => selectRecipe(recipe.id)}
                  >
                    <span className="craft-panel__recipe-name">{recipe.name}</span>
                    <span className="craft-panel__recipe-meta">
                      {canMake ? `×${batches} possível` : 'Materiais insuficientes'}
                    </span>
                  </button>
                );
              })
            )}
          </section>

          <aside className="craft-panel__detail">
            {selectedRecipe ? (
              <div className="craft-panel__detail-inner">
                <h3 className="craft-panel__detail-title">{selectedRecipe.name}</h3>
                <p className="craft-panel__detail-desc">{selectedRecipe.description}</p>

                <div className="craft-panel__materials">
                  <p className="craft-panel__section-label">Materiais</p>
                  <ul className="craft-panel__material-list">
                    {selectedRecipe.inputs.map((input) => {
                      const owned = countInventoryItem(input.itemId);
                      const need = input.quantity * craftQuantity;
                      const ok = owned >= need;

                      return (
                        <li
                          key={`${selectedRecipe.id}-${input.itemId}`}
                          className={[
                            'craft-panel__material',
                            ok ? '' : 'craft-panel__material--missing',
                          ].filter(Boolean).join(' ')}
                        >
                          {resolveInventoryItemLabel(input.itemId)} ×{need}
                          <span className="craft-panel__owned"> (possui ×{owned})</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <p className="craft-panel__output">
                  Produz:{' '}
                  <strong>
                    {resolveInventoryItemLabel(selectedRecipe.output.itemId)}
                    {' '}
                    ×{selectedRecipe.output.quantity * craftQuantity}
                  </strong>
                </p>

                <label className="craft-panel__qty">
                  <span>Lotes</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, maxBatches)}
                    step={1}
                    className="craft-panel__qty-input"
                    value={craftQuantity}
                    disabled={pending}
                    aria-busy={pending}
                    onChange={(event) => {
                      const next = Math.max(1, Math.floor(Number(event.target.value) || 1));
                      setCraftQuantity(maxBatches > 0 ? Math.min(next, maxBatches) : next);
                    }}
                  />
                </label>

                <button
                  type="button"
                  className="craft-panel__craft-btn"
                  disabled={!canCraft || pending}
                  aria-busy={pending}
                  onClick={submit}
                >
                  {buttonLabel}
                </button>
              </div>
            ) : (
              <div className="craft-panel__detail-idle">
                <p>Selecione uma receita para forjar.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </MovablePanelFrame>
  );
}
