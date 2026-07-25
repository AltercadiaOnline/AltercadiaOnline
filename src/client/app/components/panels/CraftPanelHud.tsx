// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useCraftPanel } from '../../panels/useCraftPanel.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function CraftPanelHud({ focused }) {
    const { station, recipes, selectedRecipe, selectedRecipeId, craftQuantity, maxBatches, selectRecipe, setCraftQuantity, countInventoryItem, resolveOutputLabel, getRecipeMaxBatches, craftButtonRef, craftBusyAttrs, } = useCraftPanel(true);
    const clampedQty = selectedRecipe
        ? Math.min(craftQuantity, Math.max(1, maxBatches))
        : craftQuantity;
    const header = (<header className="ui-panel__header" data-panel-drag-handle>
      <div>
        <span className="vendor-shop__tag">OFICINA // CRAFT</span>
        <h2 className="ui-panel__title">{station.stationName}</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar Oficina" onClick={() => closeHudWindow('craft')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="craft" className="ui-panel--craft" title={station.stationName} focused={focused} customHeader={header} bodyClassName="ui-panel__body craft-panel__body">
      <section className="craft-panel__recipes" aria-label="Receitas">
        {recipes.length === 0 ? (<p className="ui-empty">Nenhuma receita nesta estação.</p>) : (recipes.map((recipe) => {
            const batches = getRecipeMaxBatches(recipe);
            const canCraft = batches > 0;
            const selected = selectedRecipeId === recipe.id;
            return (<button key={recipe.id} type="button" className={[
                    'craft-panel__recipe',
                    selected ? 'craft-panel__recipe--selected' : '',
                    canCraft ? '' : 'craft-panel__recipe--blocked',
                ].filter(Boolean).join(' ')} data-select-recipe={recipe.id} disabled={!canCraft} onClick={() => selectRecipe(recipe.id)}>
                <span className="craft-panel__recipe-name">{recipe.name}</span>
                <span className="craft-panel__recipe-meta">
                  {canCraft ? `×${batches} possível` : 'Materiais insuficientes'}
                </span>
              </button>);
        }))}
      </section>
      <aside className="craft-panel__detail">
        {selectedRecipe ? (<div className="craft-panel__detail-inner">
            <h3 className="craft-panel__detail-title">{selectedRecipe.name}</h3>
            <p className="craft-panel__detail-desc">{selectedRecipe.description}</p>
            <div className="craft-panel__materials">
              <p className="craft-panel__section-label">Materiais</p>
              <ul className="craft-panel__material-list">
                {selectedRecipe.inputs.map((input) => {
                const owned = countInventoryItem(input.itemId);
                const need = input.quantity * clampedQty;
                const ok = owned >= need;
                return (<li key={input.itemId} className={[
                        'craft-panel__material',
                        ok ? '' : 'craft-panel__material--missing',
                    ].filter(Boolean).join(' ')}>
                      {resolveOutputLabel(input.itemId)}
                      {' '}
                      ×
                      {need}
                      <span className="craft-panel__owned">
                        (possui ×
                        {owned}
                        )
                      </span>
                    </li>);
            })}
              </ul>
            </div>
            <p className="craft-panel__output">
              Produz:
              {' '}
              <strong>
                {resolveOutputLabel(selectedRecipe.output.itemId)}
                {' '}
                ×
                {selectedRecipe.output.quantity * clampedQty}
              </strong>
            </p>
            <label className="craft-panel__qty">
              <span>Lotes</span>
              <input type="number" min={1} max={Math.max(1, maxBatches)} step={1} className="craft-panel__qty-input" data-craft-qty value={clampedQty} disabled={Boolean(craftBusyAttrs)} onChange={(event) => setCraftQuantity(Number(event.target.value))}/>
            </label>
            <button ref={craftButtonRef} type="button" className="craft-panel__craft-btn" data-action="confirm-craft" disabled={maxBatches < 1 || Boolean(craftBusyAttrs)} aria-busy={craftBusyAttrs ? true : undefined}>
              {craftBusyAttrs ? 'Forjando…' : 'Forjar item'}
            </button>
          </div>) : (<div className="craft-panel__detail-idle">
            <p>Selecione uma receita para forjar.</p>
          </div>)}
      </aside>
    </MovablePanelShell>);
}
