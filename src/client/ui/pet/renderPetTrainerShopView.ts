// @ts-nocheck
import { getPetDefinition, PET_KIND_ORDER, } from '../../../shared/pet/petCatalog.js';
import { getDefaultPetColorId, getPetColorPalette, PET_COLOR_ORDER, } from '../../../shared/pet/petColorPalette.js';
import { getDefaultPetGenderId, getPetGenderLabel, PET_GENDER_ORDER, } from '../../../shared/pet/petGender.js';
import { resolvePetPurchaseQuote } from '../../../shared/economy/petTrainerService.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
function escapeAttr(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}
function renderCompanionCard(model, kindId, owned) {
    const def = getPetDefinition(kindId);
    const roleTag = kindId === 'dimensional_cat' ? 'DANO / AGILIDADE' : 'DEFESA / HP';
    const stats = kindId === 'dimensional_cat'
        ? `HP ${def.hpMax} · Dano ${def.baseDamage} · Esquiva +${def.combatStats.dodgePercent ?? 0}%`
        : `HP ${def.hpMax} · Dano ${def.baseDamage} · Defesa +${def.combatStats.defensePercent ?? 0}%`;
    const selected = model.selectedKind === kindId;
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
function renderCustomizeBody(model) {
    const kindId = model.selectedKind;
    const def = getPetDefinition(kindId);
    const quote = resolvePetPurchaseQuote(kindId);
    const defaultColor = model.selectedColor ?? getDefaultPetColorId(kindId);
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
        value="${escapeAttr(model.petName)}"
      />
    </label>
    <div class="pet-trainer-customize__gender">
      <span class="pet-trainer-customize__label">Sexo</span>
      <div class="pet-trainer-customize__gender-options" data-pet-gender-options>
        ${PET_GENDER_ORDER.map((genderId) => {
        const selected = model.selectedGender === genderId;
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
  `;
}
function renderCatalogBody(model) {
    const cards = PET_KIND_ORDER.map((kindId) => renderCompanionCard(model, kindId, model.ownedKinds.has(kindId))).join('');
    const selected = model.selectedKind ? getPetDefinition(model.selectedKind) : null;
    const quote = model.selectedKind ? resolvePetPurchaseQuote(model.selectedKind) : null;
    const selectedOwned = model.selectedKind ? model.ownedKinds.has(model.selectedKind) : false;
    const canPurchase = Boolean(model.selectedKind && !selectedOwned);
    return `
    <p class="pet-trainer-shop__balance">Saldo: <strong data-wallet-volts>${model.wallet.voltsFormatted}</strong></p>
    <p class="pet-trainer-shop__hint">Adote até 3 companheiros. Ative qual segue você em Pet Love (${model.rosterCount}/3).</p>
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
  `;
}
export function buildPetTrainerShopBodyHtml(model) {
    if (model.customizeOpen && model.selectedKind) {
        return renderCustomizeBody(model);
    }
    return renderCatalogBody(model);
}
export function createDefaultPetTrainerGender() {
    return getDefaultPetGenderId();
}
