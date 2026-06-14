import type { PetSnapshot } from '../../../shared/pet/petModel.js';
import { getPetDefinition } from '../../../shared/pet/petCatalog.js';
import { getPetColorPalette } from '../../../shared/pet/petColorPalette.js';
import { getPetGenderLabel, getPetGenderSymbol } from '../../../shared/pet/petGender.js';
import { resolvePetBond } from '../../../shared/pet/petBond.js';
import { resolvePetAffinityProgress, formatPetAffinityGainPercent } from '../../../shared/pet/petAffinity.js';
import { getPetCareStatusLabel, resolvePetState } from '../../../shared/pet/petState.js';
import { getPetLifePhaseLabel } from '../../../shared/pet/petLifePhase.js';
import { formatPetRationFeedCooldown } from '../../../shared/pet/petRationFeed.js';
import type { PetRationFeedAvailability } from '../../../shared/pet/petRationFeed.js';
import { PET_AFFINITY_CONFIG } from '../../../shared/pet/petAffinityConfig.js';
import { buildPetAffinityProgressionTooltip } from '../../../shared/progression/progressionTooltipContent.js';
import { renderProgressionTooltipAttrs } from '../tooltip/progressionTooltipAttrs.js';

export type PetLoveViewVariant = 'segment' | 'standalone';

function resolveStatusLabel(pet: PetSnapshot): string {
  if (pet.hpCurrent <= 0) return 'Derrotado';
  if (pet.status === 'ACTIVE') return 'Convocado';
  return 'Guardado';
}

function renderPortrait(
  pet: PetSnapshot,
  palette: ReturnType<typeof getPetColorPalette>,
  isSenior: boolean,
): string {
  const portraitClass =
    pet.kindId === 'dimensional_dog' ? 'pet-love__portrait--dog' : 'pet-love__portrait--cat';
  const seniorClass = isSenior ? ' pet-love__portrait--senior' : '';

  return `
    <div
      class="pet-love__portrait ${portraitClass}${seniorClass}"
      style="--pet-fur:${palette.fur}; --pet-accent:${palette.accent}; --pet-eye:${palette.eye}; --pet-led:${palette.led};"
      aria-hidden="true"
    >
      <span class="pet-love__portrait-led"></span>
    </div>
  `;
}

function renderStats(
  pet: PetSnapshot,
  palette: ReturnType<typeof getPetColorPalette>,
  affinity: ReturnType<typeof resolvePetAffinityProgress>,
): string {
  const statusLabel = resolveStatusLabel(pet);
  const care = resolvePetState(pet);
  const careLabel = getPetCareStatusLabel(care.status);
  const ageLabel = `${care.ageYears.toFixed(1)} anos`;
  const phaseLabel = getPetLifePhaseLabel(care.lifePhase);
  const rationHint = care.requiresSpecialRation
    ? ' <span class="pet-love__ration-warn" title="Fase sênior — alimente com Ração Especial">⚠</span>'
    : '';
  const atkDetail = affinity.atkBuff > 0
    ? `${affinity.effectiveDamage} <span class="pet-love__stat-buff">(+${affinity.atkBuff})</span>`
    : `${affinity.effectiveDamage}`;

  return `
    <dl class="pet-love__stats">
      <div class="pet-love__stat">
        <dt>Convocação</dt>
        <dd>${statusLabel}</dd>
      </div>
      <div class="pet-love__stat">
        <dt>Bem-estar</dt>
        <dd class="pet-love__care pet-love__care--${care.status}">${careLabel}${rationHint}</dd>
      </div>
      <div class="pet-love__stat">
        <dt>Idade</dt>
        <dd class="pet-love__age${care.status === 'senior' ? ' pet-love__age--senior' : ''}">${ageLabel}</dd>
      </div>
      <div class="pet-love__stat">
        <dt>Fase</dt>
        <dd class="pet-love__phase pet-love__phase--${care.lifePhase}">${phaseLabel}</dd>
      </div>
      <div class="pet-love__stat">
        <dt>HP</dt>
        <dd>${pet.hpCurrent}/${pet.hpMax}</dd>
      </div>
      <div class="pet-love__stat">
        <dt>Paleta</dt>
        <dd>${palette.label}</dd>
      </div>
      <div class="pet-love__stat">
        <dt>Dano base</dt>
        <dd>${atkDetail}</dd>
      </div>
    </dl>
  `;
}

function renderEmpty(variant: PetLoveViewVariant): string {
  const modifier = variant === 'segment' ? 'pet-love--segment' : 'pet-love--standalone';

  return `
    <section class="pet-love ${modifier}" aria-label="Pet Love">
      <div class="pet-love__empty-card">
        <div class="pet-love__empty-icon" aria-hidden="true"></div>
        <div class="pet-love__empty-copy">
          <h3 class="pet-love__title">Pet Love</h3>
          <p class="pet-love__empty">Você ainda não tem um pet vinculado.</p>
          <p class="pet-love__hint" data-hud-fit-secondary>
            Adote uma criatura dimensional com o Treinador Zeno na cidade.
          </p>
        </div>
      </div>
    </section>
  `;
}

export type PetLoveRationControlsOptions = {
  readonly rationCharges: number;
  readonly canFeedPet: boolean;
  readonly feedAvailability: PetRationFeedAvailability;
  readonly inlineError?: string | null;
};

/** Controles de ração — cargas na HUD + botão Alimentar. */
export function renderPetLoveRationControls(options: PetLoveRationControlsOptions): string {
  const {
    rationCharges,
    canFeedPet,
    feedAvailability,
    inlineError = null,
  } = options;

  const onCooldown = !feedAvailability.canFeed;
  const noCharges = rationCharges <= 0;
  const disabled = !canFeedPet || onCooldown || noCharges;

  const cooldownHint = onCooldown
    ? `<p class="pet-love__ration-cooldown">Próxima alimentação em ${formatPetRationFeedCooldown(feedAvailability.remainingMs)}</p>`
    : '';

  const errorHint = inlineError
    ? `<p class="pet-love__feed-error" role="alert">${inlineError}</p>`
    : noCharges && canFeedPet && !onCooldown
      ? `<p class="pet-love__feed-error" role="alert">Sem cargas de ração — compre no Ancião Cael.</p>`
      : '';

  const chargeLabel = rationCharges === 1 ? 'carga' : 'cargas';

  return `
    <div class="pet-love__ration-row" data-pet-ration-row>
      <span class="pet-love__ration-count">Ração Especial: <strong>${rationCharges}</strong> ${chargeLabel}</span>
      <button
        type="button"
        class="pet-love__feed-btn${onCooldown ? ' pet-love__feed-btn--cooldown' : ''}"
        data-action="pet-feed-ration"
        ${disabled ? 'disabled' : ''}
        aria-label="${onCooldown ? 'Alimentar indisponível — cooldown de 30 min' : `Alimentar (${rationCharges} cargas restantes)`}"
      >
        Alimentar
      </button>
      ${cooldownHint}
      ${errorHint}
    </div>
  `;
}

/**
 * Conteúdo da HUD Pet Love (janela dedicada).
 */
export function renderPetLoveHud(
  pet: PetSnapshot | null,
  variant: PetLoveViewVariant = 'standalone',
  rationCharges = 0,
  feedAvailability: PetRationFeedAvailability = { canFeed: true, remainingMs: 0 },
  inlineError: string | null = null,
): string {
  if (!pet) return renderEmpty(variant);

  const def = getPetDefinition(pet.kindId);
  const palette = getPetColorPalette(pet.colorId);
  const bond = resolvePetBond(pet);
  const affinity = resolvePetAffinityProgress(pet);
  const barPercent = Math.min(100, affinity.ratio * 100);
  const nextFeedLabel = formatPetAffinityGainPercent(affinity.nextFeedGain);
  const modifier = variant === 'segment' ? 'pet-love--segment' : 'pet-love--standalone';
  const care = resolvePetState(pet);
  const isSenior = care.lifePhase === 'senior';
  const affinityTooltipAttrs = renderProgressionTooltipAttrs(
    buildPetAffinityProgressionTooltip(pet),
  );

  const canFeed = pet.hpCurrent > 0;

  return `
    <section class="pet-love ${modifier}" aria-label="Pet Love">
      <div class="pet-love__layout pet-love__layout--segmented">
        <div class="pet-love__segment pet-love__segment--portrait">
          ${renderPortrait(pet, palette, isSenior)}
        </div>

        <div class="pet-love__segment-stack">
          <div class="pet-love__segment pet-love__segment--identity">
            <div class="pet-love__head">
              <span class="pet-love__tag">VÍNCULO TÁTICO</span>
              <h3 class="pet-love__name">
                <span class="pet-love__gender" aria-label="${getPetGenderLabel(pet.gender)}" title="${getPetGenderLabel(pet.gender)}">${getPetGenderSymbol(pet.gender)}</span>
                <span class="pet-love__name-text">${pet.name}</span>
              </h3>
              <p class="pet-love__species">${def.shopTitle}</p>
            </div>
            <p class="pet-love__tier pet-love__tier--${bond.tier}">${bond.tierLabel}</p>
            ${renderPetLoveRationControls({
              rationCharges,
              canFeedPet: canFeed,
              feedAvailability,
              inlineError,
            })}
          </div>

          <div class="pet-love__segment pet-love__segment--bond">
            <div
              class="pet-love__meter"
              role="progressbar"
              ${affinityTooltipAttrs}
              aria-label="Nível de afinidade"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="${affinity.displayPercent}"
            >
              <div
                class="pet-love__meter-fill"
                style="width:${barPercent}%; --pet-love-accent:${palette.led};"
              ></div>
            </div>
            <p class="pet-love__percent">${affinity.displayPercent}% de afinidade</p>
            <p class="pet-love__progress" data-hud-fit-secondary>Próxima alimentação: +${nextFeedLabel}% · passe o mouse na barra.</p>
          </div>

          <div class="pet-love__segment pet-love__segment--stats">
            ${renderStats(pet, palette, affinity)}
          </div>

          <p class="pet-love__hint" data-hud-fit-secondary>
            Alimentação: +${nextFeedLabel}% agora (rendimento decrescente) ·
            combate vivo (+${(PET_AFFINITY_CONFIG.rewards.battleVictoryPetAlive * 100).toFixed(1)}%) ·
            exploração (+${(PET_AFFINITY_CONFIG.rewards.explorationSummonedTick * 100).toFixed(2)}% / 5 min) ·
            cada 10% afinidade = +${PET_AFFINITY_CONFIG.atkBuffPerTenPercent} ATK.
          </p>
        </div>
      </div>
    </section>
  `;
}
