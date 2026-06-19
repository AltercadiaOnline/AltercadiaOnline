import { resolveActiveServerId } from '../auth/resolveLoginServerId.js';
import { resolveServerInstanceDefinition } from '../../shared/world/serverInstanceCatalog.js';

/** Exibe o shard do deploy — seleção desabilitada (serverId imutável na criação). */
export async function syncCharSelectServerSelector(): Promise<{ ok: boolean; message?: string }> {
  const select = document.getElementById('char-select-server-input');
  const label = document.getElementById('char-select-server-label');
  const hint = document.getElementById('char-select-server-hint');

  try {
    const serverId = resolveActiveServerId();
    const definition = resolveServerInstanceDefinition(serverId);
    const maps = definition.mapIds.join(', ');

    if (select instanceof HTMLSelectElement) {
      select.replaceChildren();
      const option = document.createElement('option');
      option.value = serverId;
      option.textContent = definition.displayName;
      select.appendChild(option);
      select.value = serverId;
      select.disabled = true;
      select.setAttribute('aria-readonly', 'true');
    }

    if (label) {
      label.textContent = `Servidor — ${definition.displayName}`;
    }

    if (hint) {
      hint.textContent = `Shard fixo: ${definition.displayName} — mapas: ${maps}. Personagens são vinculados permanentemente a este servidor na criação.`;
      hint.classList.remove('is-warning');
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Servidor indisponível.';
    if (hint) {
      hint.textContent = message;
      hint.classList.add('is-warning');
    }
    return { ok: false, message };
  }
}

/** No-op — troca de shard removida (100% online autoritativo). */
export function bindCharSelectServerSelector(_onServerChanged: () => void | Promise<void>): void {}
