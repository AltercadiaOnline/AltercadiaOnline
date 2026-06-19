import {
  fetchAuthoritativeServerList,
  pickDefaultServerEntry,
} from '../services/serverListClient.js';
import {
  applyLoginServerIdToRuntime,
  readSelectedServerId,
  resolveActiveServerId,
  stashSelectedServerId,
} from '../auth/resolveLoginServerId.js';
import { resolveServerInstanceDefinition } from '../../shared/world/serverInstanceCatalog.js';

let changeHandler: (() => void | Promise<void>) | null = null;
let bound = false;

function requireSelect(): HTMLSelectElement | null {
  const element = document.getElementById('char-select-server-input');
  return element instanceof HTMLSelectElement ? element : null;
}

function formatServerOptionLabel(
  displayName: string,
  selectable: boolean,
  isCurrentDeploy: boolean,
): string {
  if (!selectable) {
    return `${displayName} (Em breve)`;
  }
  if (isCurrentDeploy) {
    return displayName;
  }
  return `${displayName} (indisponível neste deploy)`;
}

function updateServerHint(
  serverId: string,
  selectable: boolean,
  isCurrentDeploy: boolean,
): void {
  const hint = document.getElementById('char-select-server-hint');
  if (!hint) return;

  const definition = resolveServerInstanceDefinition(serverId);
  const maps = definition.mapIds.join(', ');

  if (!selectable) {
    hint.textContent = `${definition.displayName} estará disponível em breve. Mapas previstos: ${maps}`;
    hint.classList.add('is-warning');
    return;
  }

  if (!isCurrentDeploy) {
    hint.textContent = `Este deploy atende outro shard. Escolha o servidor alinhado ao gateway (mapas: ${maps}).`;
    hint.classList.add('is-warning');
    return;
  }

  hint.textContent = `Shard ativo: ${definition.displayName} — mapas: ${maps}`;
  hint.classList.remove('is-warning');
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
    option.textContent = formatServerOptionLabel(
      server.displayName,
      server.selectable,
      server.isCurrentDeploy,
    );
    option.dataset.currentDeploy = server.isCurrentDeploy ? '1' : '0';
    option.dataset.selectable = server.selectable ? '1' : '0';
    option.disabled = !server.selectable || !server.isCurrentDeploy;
    select.appendChild(option);
  }

  if (!defaultEntry) {
    return {
      ok: false,
      message: 'Nenhum servidor disponível para seleção no momento.',
    };
  }

  select.value = defaultEntry.id;
  const scoped = applyLoginServerIdToRuntime(defaultEntry.id);
  stashSelectedServerId(scoped);
  const config = resolveServerInstanceDefinition(scoped);
  const label = document.getElementById('char-select-server-label');
  if (label) {
    label.textContent = `Servidor — ${config.displayName}`;
  }
  updateServerHint(defaultEntry.id, defaultEntry.selectable, defaultEntry.isCurrentDeploy);

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
      const selectable = option?.dataset.selectable === '1';

      if (!selectable || !isCurrentDeploy) {
        return;
      }

      const scoped = applyLoginServerIdToRuntime(serverId);
      stashSelectedServerId(scoped);

      const definition = resolveServerInstanceDefinition(scoped);
      const label = document.getElementById('char-select-server-label');
      if (label) {
        label.textContent = `Servidor — ${definition.displayName}`;
      }
      updateServerHint(scoped, selectable, isCurrentDeploy);

      if (changeHandler) {
        await changeHandler();
      }
    })();
  });

  bound = true;
}
