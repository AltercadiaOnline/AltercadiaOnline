import type { PetMemorialBookSnapshot } from '../../../shared/pet/petMemorial.js';
import {
  formatMemorialDate,
  type MemorialEntry,
} from '../../../shared/pet/petMemorial.js';
import { getPetDefinition } from '../../../shared/pet/petCatalog.js';
import { getPetColorPalette } from '../../../shared/pet/petColorPalette.js';
import { getPetGenderSymbol } from '../../../shared/pet/petGender.js';
import { getPetLifePhaseLabel } from '../../../shared/pet/petLifePhase.js';
import { getInheritanceTokenDefinition } from '../../../shared/pet/petInheritance.js';

function renderMemorialPortrait(entry: MemorialEntry): string {
  const palette = getPetColorPalette(entry.colorId);
  const portraitClass =
    entry.kindId === 'dimensional_dog'
      ? 'memorial-book__portrait--dog'
      : 'memorial-book__portrait--cat';

  return `
    <div
      class="memorial-book__portrait ${portraitClass}"
      style="--pet-fur:${palette.fur}; --pet-accent:${palette.accent}; --pet-eye:${palette.eye}; --pet-led:${palette.led};"
      aria-hidden="true"
    ></div>
  `;
}

function renderMemorialCard(entry: MemorialEntry): string {
  const def = getPetDefinition(entry.kindId);
  const tokenBlock = entry.inheritanceTokenId
    ? (() => {
        const token = getInheritanceTokenDefinition(entry.inheritanceTokenId!);
        return `
          <p class="memorial-book__token">
            <span class="memorial-book__token-label">Herança</span>
            ${token.name}
          </p>
        `;
      })()
    : '<p class="memorial-book__token memorial-book__token--none">Sem token de herança</p>';

  const skillBlock = entry.preservedSkillId
    ? `<p class="memorial-book__skill">Skill preservada: ${entry.preservedSkillId}</p>`
    : '';

  return `
    <article class="memorial-book__entry" data-memorial-id="${entry.memorialId}">
      ${renderMemorialPortrait(entry)}
      <div class="memorial-book__entry-body">
        <header class="memorial-book__entry-head">
          <h3 class="memorial-book__name">
            <span class="memorial-book__gender">${getPetGenderSymbol(entry.gender)}</span>
            ${entry.petName}
          </h3>
          <p class="memorial-book__species">${def.shopTitle}</p>
        </header>
        <blockquote class="memorial-book__quote">"${entry.farewellQuote}"</blockquote>
        <dl class="memorial-book__stats">
          <div><dt>Idade final</dt><dd>${entry.ageYearsAtDeath.toFixed(1)} anos</dd></div>
          <div><dt>Fase</dt><dd>${getPetLifePhaseLabel(entry.lifePhaseAtDeath)}</dd></div>
          <div><dt>Afinidade máx.</dt><dd>${entry.maxAffinityPercent}%</dd></div>
          <div><dt>Vínculo</dt><dd>${entry.bondTierLabel}</dd></div>
          <div><dt>Nascimento</dt><dd>${formatMemorialDate(entry.birthDateMs)}</dd></div>
          <div><dt>Despedida</dt><dd>${formatMemorialDate(entry.deathDateMs)}</dd></div>
        </dl>
        ${tokenBlock}
        ${skillBlock}
      </div>
    </article>
  `;
}

export function renderMemorialBook(snapshot: PetMemorialBookSnapshot): string {
  if (snapshot.entries.length === 0) {
    return `
      <section class="memorial-book memorial-book--empty" aria-label="Livro de Memórias">
        <div class="memorial-book__empty">
          <div class="memorial-book__empty-icon" aria-hidden="true"></div>
          <h3 class="memorial-book__title">Livro de Memórias</h3>
          <p>Nenhum companheiro registrado ainda.</p>
          <p class="memorial-book__hint" data-hud-fit-secondary>
            Quando um pet completar seu ciclo de vida, o Ancião Cael preservará sua história aqui.
          </p>
        </div>
      </section>
    `;
  }

  return `
    <section class="memorial-book" aria-label="Livro de Memórias">
      <header class="memorial-book__header">
        <span class="memorial-book__tag">MEMÓRIAS // ALTERCADIA</span>
        <p class="memorial-book__subtitle">${snapshot.entries.length} companheiro(s) lembrados</p>
      </header>
      <div class="memorial-book__grid">
        ${snapshot.entries.map(renderMemorialCard).join('')}
      </div>
    </section>
  `;
}
