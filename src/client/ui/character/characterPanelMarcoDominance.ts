// @ts-nocheck
import { formatDominanceArchetypeBadge, resolveSkillDominanceProfile, } from '../../../shared/progression/skillDominanceEngine.js';
export function buildSkillDominanceProfile(input) {
    return resolveSkillDominanceProfile(input);
}
export function renderArchetypeBadge(profile) {
    return formatDominanceArchetypeBadge(profile.archetypeLabel);
}
export function renderSkillDominancePanel(profile) {
    const bars = profile.axes
        .map((axis) => `
      <li class="character-marco-bar">
        <div class="character-marco-bar__head">
          <span class="character-marco-bar__label">${axis.shortLabel}</span>
          <span class="character-marco-bar__value">${axis.percent}%</span>
        </div>
        <div class="character-marco-bar__track character-marco-bar__track--dual" role="presentation">
          <span
            class="character-marco-bar__fill character-marco-bar__fill--practice"
            style="width:${axis.practiceScore}%"
            title="Prática: ${axis.practiceScore}%"
          ></span>
          <span
            class="character-marco-bar__fill character-marco-bar__fill--potential"
            style="width:${axis.potentialScore}%"
            title="Potencial: ${axis.potentialScore}%"
          ></span>
        </div>
        <div class="character-marco-bar__meta">
          <span>P ${axis.practiceScore}</span>
          <span>Pot ${axis.potentialScore}</span>
        </div>
      </li>
    `)
        .join('');
    const hasData = profile.axes.some((axis) => axis.percent > 0);
    return `
    <div class="character-dominance-summary">
      <div class="character-dominance-summary__metrics">
        <span class="character-dominance-metric" title="Sinergia loadout × trilha Marcos">
          SIN <strong data-dominance-synergy>${profile.synergyPercent}%</strong>
        </span>
        <span class="character-dominance-metric" title="Prática vs. potencial desbloqueado">
          EFF <strong data-dominance-efficiency>${profile.efficiencyPercent}%</strong>
        </span>
      </div>
      <p class="character-dominance-summary__insight" data-dominance-insight>${profile.insight}</p>
    </div>
    <ul class="character-marco-bars" data-marco-bars>
      ${hasData
        ? bars
        : `
        <li class="character-marco-bar character-marco-bar--empty">
          <span>Equipe um loadout e entre em combate para mapear seu domínio.</span>
        </li>
      `}
    </ul>
  `;
}
export function patchSkillDominancePanel(host, profile) {
    const synergy = host.querySelector('[data-dominance-synergy]');
    if (synergy)
        synergy.textContent = `${profile.synergyPercent}%`;
    const efficiency = host.querySelector('[data-dominance-efficiency]');
    if (efficiency)
        efficiency.textContent = `${profile.efficiencyPercent}%`;
    const insight = host.querySelector('[data-dominance-insight]');
    if (insight)
        insight.textContent = profile.insight;
    const bars = host.querySelector('[data-marco-bars]');
    if (bars) {
        const temp = document.createElement('div');
        temp.innerHTML = renderSkillDominancePanel(profile);
        const nextBars = temp.querySelector('[data-marco-bars]');
        if (nextBars)
            bars.replaceWith(nextBars);
    }
}
export function patchArchetypeBadge(root, profile) {
    const badge = root.querySelector('[data-archetype-badge]');
    if (badge)
        badge.textContent = renderArchetypeBadge(profile);
}
