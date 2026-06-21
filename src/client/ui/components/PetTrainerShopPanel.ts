import {

  getPetDefinition,

  PET_KIND_ORDER,

  TREINADOR_ZENO_NPC,

  type PetKindId,

} from '../../../shared/pet/petCatalog.js';

import {

  getDefaultPetColorId,

  getPetColorPalette,

  PET_COLOR_ORDER,

  type PetColorId,

} from '../../../shared/pet/petColorPalette.js';

import {

  getDefaultPetGenderId,

  getPetGenderLabel,

  PET_GENDER_ORDER,

  type PetGenderId,

} from '../../../shared/pet/petGender.js';

import { resolvePetPurchaseQuote, validatePetPurchase } from '../../../shared/economy/petTrainerService.js';

import { formatVolts } from '../../../shared/economy/premiumCurrency.js';

import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';

import { getActionDispatcher } from '../../ActionDispatcher.js';

import { getDataStore } from '../../economy/economyLayer.js';

import { getPlayerPetStore } from '../pet/playerPetStore.js';

import { alertSystem } from '../alertSystem.js';

import { BaseUIComponent } from '../UIComponent.js';

import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';

import { uiEvents, UIEventType } from '../uiEvents.js';

import { windowManager } from '../WindowManager.js';

import { getPendingIntentRegistry } from '../../sync/pendingIntentRegistry.js';
import {
  closeReactMovablePanel,
  focusReactMovablePanel,
  isReactMovablePanelEnabled,
  openReactMovablePanel,
} from '../../app/panels/reactMovablePanelBridge.js';
import { tryOpenReactWorldPanel } from '../../app/panels/initWorldPanelsBridge.js';



export type PetTrainerShopContext = {

  readonly vendorId: string;

  readonly vendorName: string;

};



/** Loja do Treinador Zeno — Gato e Cachorro Dimensionais com personalização. */

export class PetTrainerShopPanel extends BaseUIComponent {

  private readonly dataStore = getDataStore();

  private readonly dispatcher = getActionDispatcher();



  private vendor: PetTrainerShopContext = {

    vendorId: TREINADOR_ZENO_NPC,

    vendorName: 'Treinador Zeno',

  };

  private wallet: WalletSnapshot = this.dataStore.getWallet();

  private selectedKind: PetKindId | null = null;

  private customizeOpen = false;

  private petName = '';

  private selectedColor: PetColorId | null = null;

  private selectedGender: PetGenderId = getDefaultPetGenderId();



  private unsubWallet: (() => void) | null = null;



  constructor() {

    super({

      id: 'petTrainerShop',

      rootClassName: 'ui-panel ui-panel--pet-trainer-shop ui-panel--movable',

    });

  }

  /** Catálogo compacto — evita auto-scale que trava cliques e corta o rodapé. */
  protected override shouldUseDynamicLayout(): boolean {
    return false;
  }

  override mount(parent: HTMLElement): void {
    if (isReactMovablePanelEnabled()) return;
    super.mount(parent);
  }

  override open(): void {
    if (openReactMovablePanel(this, 'petTrainerShop')) return;
    super.open();
  }

  override close(): void {
    if (closeReactMovablePanel(this, 'petTrainerShop')) return;
    super.close();
  }

  override focus(): void {
    if (focusReactMovablePanel(this, 'petTrainerShop')) return;
    super.focus();
  }

  override getRootElement(): HTMLElement | null {
    if (isReactMovablePanelEnabled()) return null;
    return super.getRootElement();
  }

  openForVendor(context: PetTrainerShopContext): void {
    if (tryOpenReactWorldPanel('petTrainerShop', {
      kind: 'petTrainerShop',
      vendorId: context.vendorId,
      vendorName: context.vendorName,
    })) {
      return;
    }

    this.vendor = { ...context };

    this.selectedKind = null;

    this.customizeOpen = false;

    this.petName = '';

    this.selectedColor = null;

    this.selectedGender = getDefaultPetGenderId();

    this.refreshSnapshots();

    this.render();

    this.open();

  }



  protected override onOpen(): void {

    this.refreshSnapshots();

    this.unsubWallet = this.dataStore.subscribe('wallet', (wallet) => {

      this.wallet = wallet;

      if (this.isOpen()) this.updateWalletLabel();

    });

  }



  protected override onClose(): void {

    this.unsubWallet?.();

    this.unsubWallet = null;

    this.selectedKind = null;

    this.customizeOpen = false;

    this.petName = '';

    this.selectedColor = null;

    this.selectedGender = getDefaultPetGenderId();

    const snapshot = endWorldHudInteractionSession();
    if (snapshot) {
      uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
    }

  }

  private requestClose(): void {
    windowManager.close('petTrainerShop');
  }

  private isKindOwned(kindId: PetKindId): boolean {
    return getPlayerPetStore().getRoster().pets.some((pet) => pet.kindId === kindId);
  }



  private refreshSnapshots(): void {

    this.wallet = this.dataStore.getWallet();

  }



  createTemplate(): string {

    if (this.customizeOpen && this.selectedKind) {

      return this.renderCustomizeStep();

    }



    const roster = getPlayerPetStore().getRoster();

    const cards = PET_KIND_ORDER.map((kindId) => this.renderCompanionCard(
      kindId,
      roster.pets.some((pet) => pet.kindId === kindId),
    )).join('');

    const selected = this.selectedKind ? getPetDefinition(this.selectedKind) : null;

    const quote = this.selectedKind ? resolvePetPurchaseQuote(this.selectedKind) : null;
    const selectedOwned = this.selectedKind ? this.isKindOwned(this.selectedKind) : false;
    const canPurchase = Boolean(this.selectedKind && !selectedOwned);



    return `

      <header class="ui-panel__header pet-trainer-shop__header" data-panel-drag-handle>

        <div class="pet-trainer-shop__header-main">

          <span class="pet-trainer-shop__tag">COMPANHEIROS // DIMENSIONAIS</span>

          <h2 class="ui-panel__title pet-trainer-shop__title">${this.vendor.vendorName}</h2>

        </div>

        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar loja de pets">×</button>

      </header>

      <div class="ui-panel__body pet-trainer-shop__body">

        <p class="pet-trainer-shop__balance">Saldo: <strong data-wallet-volts>${this.wallet.voltsFormatted}</strong></p>

        <p class="pet-trainer-shop__hint">Adote até 3 companheiros. Ative qual segue você em Pet Love (${roster.pets.length}/3).</p>

        <div class="pet-trainer-shop__grid" data-pet-cards>

          ${cards}

        </div>

        <footer class="pet-trainer-shop__footer">

          <p class="pet-trainer-shop__selection" data-pet-selection>

            ${selected
              ? selectedOwned
                ? `${selected.shopTitle} — você já possui este companheiro.`
                : `${selected.shopTitle} — ${formatVolts(quote?.priceVolts ?? 0)}`
              : 'Selecione um companheiro.'}

          </p>

          <button

            type="button"

            class="pet-trainer-shop__buy"

            data-action="open-customize"

            ${canPurchase ? '' : 'disabled'}

          >Comprar</button>

        </footer>

      </div>

    `;

  }



  private renderCustomizeStep(): string {

    const kindId = this.selectedKind!;

    const def = getPetDefinition(kindId);

    const quote = resolvePetPurchaseQuote(kindId);

    const defaultColor = this.selectedColor ?? getDefaultPetColorId(kindId);

    const swatches = PET_COLOR_ORDER.map((colorId) => {

      const palette = getPetColorPalette(colorId);

      const selected = defaultColor === colorId;

      return `

        <button

          type="button"

          class="pet-trainer-palette${selected ? ' pet-trainer-palette--selected' : ''}"

          data-pet-color="${colorId}"

          aria-pressed="${selected ? 'true' : 'false'}"

          title="${palette.label}"

          style="--pet-swatch:${palette.fur}; --pet-led:${palette.led};"

        >

          <span class="pet-trainer-palette__fur"></span>

          <span class="pet-trainer-palette__led"></span>

        </button>

      `;

    }).join('');



    return `

      <header class="ui-panel__header pet-trainer-shop__header" data-panel-drag-handle>

        <div class="pet-trainer-shop__header-main">

          <span class="pet-trainer-shop__tag">PERSONALIZAR // ${def.shopTitle.toUpperCase()}</span>

          <h2 class="ui-panel__title pet-trainer-shop__title">Nome, Sexo e Cor</h2>

        </div>

        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar loja de pets">×</button>

      </header>

      <div class="ui-panel__body pet-trainer-shop__body pet-trainer-shop__body--customize">

        <button type="button" class="pet-trainer-shop__back" data-action="back-catalog">← Voltar ao catálogo</button>

        <div class="pet-trainer-customize__preview">

          <canvas class="pet-trainer-card__preview" data-pet-custom-preview width="96" height="96" aria-hidden="true"></canvas>

        </div>

        <label class="pet-trainer-customize__field">

          <span class="pet-trainer-customize__label">Nome do companheiro</span>

          <input

            type="text"

            class="pet-trainer-customize__input"

            data-pet-name-input

            maxlength="16"

            placeholder="${def.name}"

            value="${this.escapeAttr(this.petName)}"

          />

        </label>

        <div class="pet-trainer-customize__gender">

          <span class="pet-trainer-customize__label">Sexo</span>

          <div class="pet-trainer-customize__gender-options" data-pet-gender-options>

            ${PET_GENDER_ORDER.map((genderId) => {

              const selected = this.selectedGender === genderId;

              const symbol = genderId === 'male' ? '♂' : '♀';

              return `

                <button

                  type="button"

                  class="pet-trainer-gender${selected ? ' pet-trainer-gender--selected' : ''}"

                  data-pet-gender="${genderId}"

                  aria-pressed="${selected ? 'true' : 'false'}"

                >${symbol} ${getPetGenderLabel(genderId)}</button>

              `;

            }).join('')}

          </div>

        </div>

        <div class="pet-trainer-customize__palette">

          <span class="pet-trainer-customize__label">Paleta techwear</span>

          <div class="pet-trainer-customize__swatches" data-pet-swatches>

            ${swatches}

          </div>

        </div>

        <footer class="pet-trainer-shop__footer">

          <p class="pet-trainer-shop__selection">${def.shopTitle} — ${formatVolts(quote.priceVolts)}</p>

          <button type="button" class="pet-trainer-shop__buy" data-action="confirm-buy">Confirmar Compra</button>

        </footer>

      </div>

    `;

  }



  private renderCompanionCard(kindId: PetKindId, owned: boolean): string {

    const def = getPetDefinition(kindId);

    const roleTag = kindId === 'dimensional_cat' ? 'DANO / AGILIDADE' : 'DEFESA / HP';

    const stats = kindId === 'dimensional_cat'

      ? `HP ${def.hpMax} · Dano ${def.baseDamage} · Esquiva +${def.combatStats.dodgePercent ?? 0}%`

      : `HP ${def.hpMax} · Dano ${def.baseDamage} · Defesa +${def.combatStats.defensePercent ?? 0}%`;

    const selected = this.selectedKind === kindId;



    return `

      <article

        class="pet-trainer-card${selected ? ' pet-trainer-card--selected' : ''}${owned ? ' pet-trainer-card--owned' : ''}"

        data-pet-kind="${kindId}"

        ${owned ? '' : 'tabindex="0" role="button"'}
        aria-pressed="${selected ? 'true' : 'false'}"
        ${owned ? 'aria-disabled="true"' : ''}

      >

        <header class="pet-trainer-card__head">

          <span class="pet-trainer-card__role">${roleTag}</span>

          ${owned ? '<span class="pet-trainer-card__owned">SEU</span>' : ''}

        </header>

        <canvas class="pet-trainer-card__preview" data-pet-preview="${kindId}" width="96" height="96" aria-hidden="true"></canvas>

        <h3 class="pet-trainer-card__title">${def.shopTitle}</h3>

        <p class="pet-trainer-card__pitch">${def.shopPitch}</p>

        <p class="pet-trainer-card__stats">${stats}</p>

        <p class="pet-trainer-card__price">${formatVolts(def.priceVolts)}</p>

      </article>

    `;

  }



  protected override bindEvents(): void {

    this.root?.addEventListener('click', (event) => {

      const target = event.target;

      if (!(target instanceof Element)) return;



      if (target.closest('[data-action="close"]')) {

        this.requestClose();

        return;

      }



      if (target.closest('[data-action="back-catalog"]')) {

        this.customizeOpen = false;

        this.render();

        return;

      }



      if (target.closest('[data-action="open-customize"]')) {

        this.openCustomizeStep();

        return;

      }



      if (target.closest('[data-action="confirm-buy"]')) {

        void this.purchaseSelected();

        return;

      }



      const colorBtn = target.closest<HTMLElement>('[data-pet-color]');

      if (colorBtn?.dataset.petColor) {

        this.selectedColor = colorBtn.dataset.petColor as PetColorId;

        this.render();

        return;

      }



      const genderBtn = target.closest<HTMLElement>('[data-pet-gender]');

      if (genderBtn?.dataset.petGender) {

        this.selectedGender = genderBtn.dataset.petGender as PetGenderId;

        this.render();

        return;

      }



      const card = target.closest<HTMLElement>('[data-pet-kind]');

      if (card?.dataset.petKind) {

        if (card.classList.contains('pet-trainer-card--owned')) return;

        this.selectKind(card.dataset.petKind as PetKindId);

      }

    });



    this.root?.addEventListener('input', (event) => {

      const target = event.target;

      if (!(target instanceof HTMLInputElement)) return;

      if (target.matches('[data-pet-name-input]')) {

        this.petName = target.value;

      }

    });

  }



  protected override afterRender(): void {

    this.paintPreviews();

  }



  private paintPreviews(): void {

    if (!this.root) return;

    import('../../entities/pet/petRenderer.js').then(({ renderPetShopPreview }) => {

      if (this.customizeOpen && this.selectedKind) {

        const canvas = this.root?.querySelector<HTMLCanvasElement>('[data-pet-custom-preview]');

        const ctx = canvas?.getContext('2d');

        if (canvas && ctx) {

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const colorId = this.selectedColor ?? getDefaultPetColorId(this.selectedKind!);

          renderPetShopPreview(
            ctx,
            this.selectedKind!,
            8,
            8,
            canvas.width - 16,
            colorId,
            this.selectedGender,
          );

        }

        return;

      }



      for (const kindId of PET_KIND_ORDER) {

        const canvas = this.root?.querySelector<HTMLCanvasElement>(`[data-pet-preview="${kindId}"]`);

        const ctx = canvas?.getContext('2d');

        if (!canvas || !ctx) continue;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        renderPetShopPreview(ctx, kindId, 8, 8, canvas.width - 16);

      }

    });

  }



  private selectKind(kindId: PetKindId): void {

    if (this.isKindOwned(kindId)) return;

    this.selectedKind = kindId;

    this.render();

  }



  private openCustomizeStep(): void {

    if (!this.selectedKind || this.isKindOwned(this.selectedKind)) return;

    this.customizeOpen = true;

    this.selectedColor = getDefaultPetColorId(this.selectedKind);

    this.selectedGender = getDefaultPetGenderId();

    const def = getPetDefinition(this.selectedKind);

    if (!this.petName.trim()) this.petName = def.name;

    this.render();

  }



  private updateWalletLabel(): void {

    const el = this.query<HTMLElement>('[data-wallet-volts]');

    if (el) el.textContent = this.wallet.voltsFormatted;

  }



  private async purchaseSelected(): Promise<void> {

    if (!this.selectedKind) return;



    const colorId = this.selectedColor ?? getDefaultPetColorId(this.selectedKind);

    const nameInput = this.root?.querySelector<HTMLInputElement>('[data-pet-name-input]');

    const name = nameInput?.value.trim() || this.petName.trim() || getPetDefinition(this.selectedKind).name;



    const validation = validatePetPurchase({

      vendorId: this.vendor.vendorId,

      kindId: this.selectedKind,

      name,

      colorId,

      gender: this.selectedGender,

      walletVolts: this.wallet.dollarVolt,

      ownedPetCount: getPlayerPetStore().getRoster().pets.length,

    });

    if (!validation.ok) {

      alertSystem(validation.reason);

      return;

    }



    const result = this.dispatcher.dispatch({

      type: 'PURCHASE_PET',

      payload: {

        vendorId: this.vendor.vendorId,

        kindId: this.selectedKind,

        name: validation.adoption.name,

        colorId: validation.adoption.colorId,

        gender: validation.adoption.gender,

      },

    });



    if (!result.ok) {

      alertSystem(result.reason);

      return;

    }



    if (result.status === 'applied') {

      this.onPurchaseSettled(validation.adoption.name, { notify: true });

      return;

    }

    if (result.status === 'pending') {

      this.awaitPurchaseIntent(result.intentId, this.selectedKind, validation.adoption.name);

    }

  }



  private onPurchaseSettled(petName: string, options: { readonly notify?: boolean } = {}): void {

    if (options.notify) {

      alertSystem(`${petName} adotado com sucesso!`);

    }

    this.requestClose();

  }



  private awaitPurchaseIntent(intentId: string, kindId: PetKindId, petName: string): void {

    const registry = getPendingIntentRegistry();

    const finalize = (): void => {

      if (registry.isIntentPending(intentId)) return;

      off();

      if (this.isKindOwned(kindId)) {

        this.onPurchaseSettled(petName);

      }

    };

    const off = registry.subscribeChange(finalize);

    finalize();

  }



  private escapeAttr(value: string): string {

    return value

      .replace(/&/g, '&amp;')

      .replace(/"/g, '&quot;')

      .replace(/</g, '&lt;');

  }

}


