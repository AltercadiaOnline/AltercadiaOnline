import type { PetSnapshot } from '../../../shared/pet/petModel.js';
import {
  MAX_PETS_PER_CHARACTER,
  type PlayerPetRosterSnapshot,
} from '../../../shared/pet/petRoster.js';
import { formatPetNameWithGender } from '../../../shared/pet/petGender.js';
import { renderPetLoveHud } from './petLoveView.js';
import type { PetRationFeedAvailability } from '../../../shared/pet/petRationFeed.js';

function renderSlotTab(
  slotIndex: number,
  pet: PetSnapshot | null,
  roster: PlayerPetRosterSnapshot,
): string {
  const selected = roster.selectedSlotIndex === slotIndex;
  const isActive = roster.activeSlotIndex === slotIndex;
  const label = pet ? formatPetNameWithGender(pet) : `Slot ${slotIndex + 1}`;
  const empty = !pet;

  return `
    <button
      type="button"
      class="pet-love-roster__tab${selected ? ' pet-love-roster__tab--selected' : ''}${empty ? ' pet-love-roster__tab--empty' : ''}"
      data-action="pet-select-slot"
      data-pet-slot="${slotIndex}"
      aria-pressed="${selected ? 'true' : 'false'}"
      aria-label="${empty ? `Slot vazio ${slotIndex + 1}` : label}${isActive ? ' — convocado' : ''}"
    >
      <span class="pet-love-roster__tab-label">${empty ? '—' : label}</span>
      ${isActive ? '<span class="pet-love-roster__tab-badge">Ativo</span>' : ''}
    </button>
  `;
}

/** Controles de convocar/guardar — renderizado na barra de ações do painel. */
export function renderPetLoveActivateControl(
  roster: PlayerPetRosterSnapshot,
  pet: PetSnapshot | null,
): string {
  if (!pet) {
    return `
      <p class="pet-love-roster__activate-hint" data-hud-fit-secondary>
        Slot vazio — adote até ${MAX_PETS_PER_CHARACTER} pets com o Treinador Zeno.
      </p>
    `;
  }

  const slot = roster.selectedSlotIndex;
  const isActive = roster.activeSlotIndex === slot;
  const defeated = pet.hpCurrent <= 0;

  if (defeated) {
    return `
      <p class="pet-love-roster__activate-hint pet-love-roster__activate-hint--warn">
        Companheiro ferido — visite o Ancião Cael para reviver.
      </p>
    `;
  }

  if (isActive) {
    return `
      <button
        type="button"
        class="pet-love-roster__activate-btn pet-love-roster__activate-btn--active"
        data-action="pet-deactivate"
        aria-label="Guardar ${pet.name}"
      >
        Guardar ${formatPetNameWithGender(pet)}
      </button>
      <p class="pet-love-roster__activate-hint" data-hud-fit-secondary>Convocado — segue você no mapa e entra em combate.</p>
    `;
  }

  return `
    <button
      type="button"
      class="pet-love-roster__activate-btn"
      data-action="pet-activate"
      data-pet-slot="${slot}"
      aria-label="Ativar ${pet.name}"
    >
      Ativar ${formatPetNameWithGender(pet)}
    </button>
    <p class="pet-love-roster__activate-hint" data-hud-fit-secondary>Só um companheiro pode estar ativo por vez.</p>
  `;
}

/** Detalhe do pet selecionado — patch rápido ao trocar aba. */
export function renderPetLoveRosterDetail(
  roster: PlayerPetRosterSnapshot,
  feedAvailability: PetRationFeedAvailability = { canFeed: true, remainingMs: 0 },
  rationCharges = 0,
  inlineError: string | null = null,
): string {
  const selectedPet = roster.pets[roster.selectedSlotIndex] ?? null;
  return selectedPet
    ? renderPetLoveHud(selectedPet, 'standalone', rationCharges, feedAvailability, inlineError)
    : renderPetLoveHud(null, 'standalone', rationCharges, feedAvailability, inlineError);
}

/** HUD Pet Love com até 3 slots e seleção de companheiro ativo. */
export function renderPetLoveRosterHud(
  roster: PlayerPetRosterSnapshot,
  feedAvailability: PetRationFeedAvailability = { canFeed: true, remainingMs: 0 },
  rationCharges = 0,
  inlineError: string | null = null,
): string {
  const slots = Array.from({ length: MAX_PETS_PER_CHARACTER }, (_, index) => {
    const pet = roster.pets[index] ?? null;
    return renderSlotTab(index, pet, roster);
  }).join('');

  return `
    <div class="pet-love-roster" data-hud-fit-root>
      <nav class="pet-love-roster__tabs" aria-label="Slots de companheiros">
        ${slots}
      </nav>
      <div class="pet-love-roster__detail">
        ${renderPetLoveRosterDetail(roster, feedAvailability, rationCharges, inlineError)}
      </div>
    </div>
  `;
}
