import {
  applyLoginServerIdToRuntime,
  readSelectedServerId,
  resolveActiveServerId,
  stashSelectedServerId,
} from '../auth/resolveLoginServerId.js';
import {
  fetchAuthoritativeServerList,
  pickDefaultServerEntry,
} from '../services/serverListClient.js';
import { resolveServerInstanceDefinition } from '../../shared/world/serverInstanceCatalog.js';

let changeHandler: (() => void | Promise<void>) | null = null;
let bound = false;

function requireSelect(): HTMLSelectElement | null {
  const element = document.getElementById('char-select-server-input');
  return element instanceof HTMLSelectElement ? element : null;
}

function updateServerHint(serverId: string, isCurrentDeploy: boolean): void {
  const hint = document.getElementById('char-select-server-hint');
  if (!hint) return;

  const definition = resolveServerInstanceDefinition(serverId);
  const maps = definition.mapIds.join(', ');
  hint.textContent = isCurrentDeploy
    ? `Shard ativo: ${definition.displayName} — mapas: ${maps}`
    : `Atenção: este deploy atende "${definition.displayName}". Confirme que o gateway aponta para o shard correto antes de entrar. Mapas: ${maps}`;
  hint.classList.toggle('is-warning', !isCurrentDeploy);
}

/** Popula o dropdown de shard na char select a partir de GET /api/servers. */
export async function syncCharSelectServerSelector(): Promise<{ ok: boolean; message?: string }> {
  const select = requireSelect();
  if (!select) {
    return { ok: false, message: 'Seletor de servidor ausente na char select.' };
  }

  const result = await fetchAuthoritativeServerList();
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  const preferred = readSelectedServerId()
    ?? (() => {
      try {
        return resolveActiveServerId();
      } catch {
        return null;
      }
    })();
  const defaultEntry = pickDefaultServerEntry(result.list.servers, preferred)
    ?? pickDefaultServerEntry(result.list.servers, result.list.defaultServerId);

  select.replaceChildren();

  for (const server of result.list.servers) {
    const option = document.createElement('option');
    option.value = server.id;
    option.textContent = server.isCurrentDeploy
      ? `${server.displayName} (deploy atual)`
      : `${server.displayName} (indisponível)`;
    option.dataset.currentDeploy = server.isCurrentDeploy ? '1' : '0';
    option.disabled = !server.isCurrentDeploy;
    select.appendChild(option);
  }

  if (defaultEntry) {
    select.value = defaultEntry.id;
    const scoped = applyLoginServerIdToRuntime(defaultEntry.id);
    stashSelectedServerId(scoped);
    const config = resolveServerInstanceDefinition(scoped);
    const label = document.getElementById('char-select-server-label');
    if (label) {
      label.textContent = `Servidor — ${config.displayName}`;
    }
    updateServerHint(defaultEntry.id, defaultEntry.isCurrentDeploy);
  }

  return { ok: true };
}

export function bindCharSelectServerSelector(
  onServerChanged: () => void | Promise<void>,
): void {
  changeHandler = onServerChanged;
  if (bound) return;

  const select = requireSelect();
  if (!select) return;

  select.addEventListener('change', () => {
    void (async () => {
      const serverId = select.value.trim();
      if (!serverId) return;

      const option = select.selectedOptions[0];
      const isCurrentDeploy = option?.dataset.currentDeploy === '1';

      const scoped = applyLoginServerIdToRuntime(serverId);
      stashSelectedServerId(scoped);

      const definition = resolveServerInstanceDefinition(scoped);
      const label = document.getElementById('char-select-server-label');
      if (label) {
        label.textContent = `Servidor — ${definition.displayName}`;
      }
      updateServerHint(scoped, isCurrentDeploy);

      if (changeHandler) {
        await changeHandler();
      }
    })();
  });

  bound = true;
}
