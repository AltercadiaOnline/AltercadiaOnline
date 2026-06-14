import {
  getEstiloPersonagem,
  getEstiloPersonagemLabel,
} from '../../../shared/progression/estiloPersonagem.js';
import type { MarcosStateSnapshot } from '../../../shared/playerDataSnapshots.js';

export function resolveEstiloName(
  loadout: readonly string[],
  marcos: MarcosStateSnapshot,
): string {
  return getEstiloPersonagemLabel(getEstiloPersonagem(loadout, marcos));
}

export function renderEstiloLine(estiloName: string): string {
  return `
    <p class="character-estilo-line" data-estilo-line aria-label="Estilo de combate">
      <span class="character-estilo-line__label">ESTILO:</span>
      <span class="character-estilo-line__value" data-estilo-value>${estiloName}</span>
    </p>
  `;
}

export function patchEstiloLine(root: ParentNode, estiloName: string): void {
  const value = root.querySelector('[data-estilo-value]');
  if (value) value.textContent = estiloName;
}
