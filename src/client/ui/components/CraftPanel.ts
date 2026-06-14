import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import {
  inventorySnapshotToCraftRows,
  listCraftRecipesForStation,
  resolveMaxCraftBatches,
  type CraftRecipe,
} from '../../../shared/crafting/craftValidation.js';
import { CRAFT_STATION_FERREIRO } from '../../../shared/crafting/craftRecipes.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { resolveInventoryItemLabel } from '../inventory/inventoryItemDisplay.js';
import { alertSystem } from '../alertSystem.js';
import { BaseUIComponent } from '../UIComponent.js';
import {
  ActionGatewayButtonController,
  type ActionGatewayButtonOptions,
} from './ActionGatewayButton.js';

export type CraftStationContext = {
  readonly craftStationId: string;
  readonly stationName: string;
};

/** Painel de craft — Ferreiro (estação autoritativa no servidor). */
export class CraftPanel extends BaseUIComponent {
  private readonly dataStore = getDataStore();
  private readonly dispatcher = getActionDispatcher();

  private station: CraftStationContext = {
    craftStationId: CRAFT_STATION_FERREIRO,
    stationName: 'Ferreiro',
  };
  private inventory: InventorySnapshot = this.dataStore.getInventory();
  private selectedRecipeId: string | null = null;
  private craftQuantity = 1;

  private unsubInventory: (() => void) | null = null;
  private readonly craftGateway = new ActionGatewayButtonController(
    () => this.buildCraftGatewayOptions(),
  );

  constructor() {
    super({ id: 'craft', rootClassName: 'ui-panel ui-panel--craft ui-panel--movable' });
  }

  openForStation(context: CraftStationContext): void {
    this.station = { ...context };
    this.selectedRecipeId = null;
    this.craftQuantity = 1;
    this.refreshSnapshots();
    this.render();
    this.open();
  }

  protected override onOpen(): void {
    this.refreshSnapshots();
    this.unsubInventory = this.dataStore.subscribe('inventory', (inventory) => {
      this.inventory = inventory;
      if (this.isOpen()) this.render();
    });
  }

  protected override onClose(): void {
    this.unsubInventory?.();
    this.unsubInventory = null;
    this.craftGateway.detach();
    this.selectedRecipeId = null;
    this.craftQuantity = 1;
  }

  protected override afterRender(): void {
    this.craftGateway.attach(this.query<HTMLButtonElement>('[data-action="confirm-craft"]'));
  }

  private refreshSnapshots(): void {
    this.inventory = this.dataStore.getInventory();
  }

  createTemplate(): string {
    const recipes = listCraftRecipesForStation(this.station.craftStationId);
    const selected = this.selectedRecipeId
      ? recipes.find((recipe) => recipe.id === this.selectedRecipeId) ?? null
      : null;

    return `
      <header class="ui-panel__header" data-panel-drag-handle>
        <div>
          <span class="vendor-shop__tag">OFICINA // CRAFT</span>
          <h2 class="ui-panel__title">${this.station.stationName}</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar Oficina">×</button>
      </header>
      <div class="ui-panel__body craft-panel__body">
        <section class="craft-panel__recipes" aria-label="Receitas">
          ${recipes.length === 0
            ? '<p class="ui-empty">Nenhuma receita nesta estação.</p>'
            : recipes.map((recipe) => this.renderRecipeRow(recipe)).join('')}
        </section>
        <aside class="craft-panel__detail">
          ${selected ? this.renderRecipeDetail(selected) : this.renderDetailIdle()}
        </aside>
      </div>
    `;
  }

  private getCraftInventoryRows() {
    return inventorySnapshotToCraftRows(this.inventory);
  }

  private renderRecipeRow(recipe: CraftRecipe): string {
    const maxBatches = resolveMaxCraftBatches(recipe, this.getCraftInventoryRows());
    const canCraft = maxBatches > 0;
    const selected = this.selectedRecipeId === recipe.id;

    return `
      <button
        type="button"
        class="craft-panel__recipe${selected ? ' craft-panel__recipe--selected' : ''}${canCraft ? '' : ' craft-panel__recipe--blocked'}"
        data-select-recipe="${recipe.id}"
        ${canCraft ? '' : 'disabled'}
      >
        <span class="craft-panel__recipe-name">${recipe.name}</span>
        <span class="craft-panel__recipe-meta">${canCraft ? `×${maxBatches} possível` : 'Materiais insuficientes'}</span>
      </button>
    `;
  }

  private renderDetailIdle(): string {
    return `
      <div class="craft-panel__detail-idle">
        <p>Selecione uma receita para forjar.</p>
      </div>
    `;
  }

  private renderRecipeDetail(recipe: CraftRecipe): string {
    const maxBatches = resolveMaxCraftBatches(recipe, this.getCraftInventoryRows());
    const clampedQty = Math.min(this.craftQuantity, Math.max(1, maxBatches));
    const outputLabel = resolveInventoryItemLabel(recipe.output.itemId);
    const outputQty = recipe.output.quantity * clampedQty;

    return `
      <div class="craft-panel__detail-inner">
        <h3 class="craft-panel__detail-title">${recipe.name}</h3>
        <p class="craft-panel__detail-desc">${recipe.description}</p>
        <div class="craft-panel__materials">
          <p class="craft-panel__section-label">Materiais</p>
          <ul class="craft-panel__material-list">
            ${recipe.inputs
              .map((input) => {
                const owned = this.countInventoryItem(input.itemId);
                const need = input.quantity * clampedQty;
                const ok = owned >= need;
                return `<li class="craft-panel__material${ok ? '' : ' craft-panel__material--missing'}">
                  ${resolveInventoryItemLabel(input.itemId)} ×${need}
                  <span class="craft-panel__owned">(possui ×${owned})</span>
                </li>`;
              })
              .join('')}
          </ul>
        </div>
        <p class="craft-panel__output">
          Produz: <strong>${outputLabel} ×${outputQty}</strong>
        </p>
        <label class="craft-panel__qty">
          <span>Lotes</span>
          <input
            type="number"
            min="1"
            max="${Math.max(1, maxBatches)}"
            step="1"
            class="craft-panel__qty-input"
            data-craft-qty
            value="${clampedQty}"
            ${this.craftGateway.busyAttrs()}
          />
        </label>
        <button
          type="button"
          class="craft-panel__craft-btn"
          data-action="confirm-craft"
          ${maxBatches < 1 || this.craftGateway.busyAttrs() ? 'disabled' : ''}
          ${this.craftGateway.isInFlight() ? 'aria-busy="true"' : ''}
        >
          ${this.craftGateway.isInFlight() ? 'Forjando…' : 'Forjar item'}
        </button>
      </div>
    `;
  }

  private countInventoryItem(itemId: string): number {
    return this.getCraftInventoryRows().find((row) => row.itemId === itemId)?.quantity ?? 0;
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        this.close();
        return;
      }

      const recipeBtn = target.closest<HTMLElement>('[data-select-recipe]');
      if (recipeBtn) {
        this.selectedRecipeId = recipeBtn.dataset.selectRecipe ?? null;
        this.craftQuantity = 1;
        this.render();
      }
    });

    this.root?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.matches('[data-craft-qty]')) return;
      if (!this.selectedRecipeId) return;

      this.craftQuantity = Math.max(1, Math.floor(Number(target.value) || 1));
      const recipe = listCraftRecipesForStation(this.station.craftStationId)
        .find((row) => row.id === this.selectedRecipeId);
      if (recipe) {
        const max = resolveMaxCraftBatches(recipe, this.getCraftInventoryRows());
        if (max > 0) this.craftQuantity = Math.min(this.craftQuantity, max);
      }
      if (String(this.craftQuantity) !== target.value) {
        target.value = String(this.craftQuantity);
      }
    });
  }

  private buildCraftGatewayOptions(): ActionGatewayButtonOptions {
    return {
      pendingLabel: 'Forjando…',
      relatedElements: () => {
        const qty = this.query<HTMLInputElement>('[data-craft-qty]');
        return qty ? [qty] : [];
      },
      onClick: () => {
        if (!this.selectedRecipeId) return;

        const result = this.dispatcher.dispatch({
          type: 'CRAFT_ITEM',
          payload: {
            craftStationId: this.station.craftStationId,
            recipeId: this.selectedRecipeId,
            quantity: this.craftQuantity,
          },
        });

        if (!result.ok) {
          alertSystem(result.reason);
          return;
        }

        if (result.status === 'applied') {
          this.craftQuantity = 1;
          this.render();
        }
        return result;
      },
      onResolved: () => {
        this.craftQuantity = 1;
        this.render();
      },
    };
  }
}
