import {
  fetchAuthoritativeServerList,
  findServerEntryById,
} from '../services/serverListClient.js';
import { resolveActiveServerId } from '../auth/resolveLoginServerId.js';
import { redirectToShardOrigin } from '../net/shardRedirect.js';
import type { ServerListResponse } from '../../shared/world/serverListProtocol.js';

let cachedServerList: ServerListResponse | null = null;
let selectorBound = false;

function resolveCurrentServerId(fallbackId: string): string {
  try {
    return resolveActiveServerId();
  } catch {
    return fallbackId;
  }
}

function countSelectableServers(list: ServerListResponse): number {
  return list.servers.filter((entry) => entry.selectable).length;
}

function formatServerOptionLabel(
  entry: ServerListResponse['servers'][number],
): string {
  if (entry.isCurrentDeploy) {
    return `${entry.displayName} (atual)`;
  }
  if (!entry.selectable) {
    return `${entry.displayName} — Em breve`;
  }
  return entry.displayName;
}

function updateServerSelectorHint(
  list: ServerListResponse,
  activeId: string,
  hint: HTMLElement | null,
): void {
  if (!hint) return;

  const active = findServerEntryById(list.servers, activeId);
  const maps = active?.mapIds.join(', ') ?? '—';
  const selectableCount = countSelectableServers(list);

  if (selectableCount <= 1) {
    hint.textContent =
      `Shard: ${active?.displayName ?? activeId} — mapas: ${maps}. `
      + 'Personagens são vinculados permanentemente a este servidor na criação.';
  } else {
    hint.textContent =
      `Servidor atual: ${active?.displayName ?? activeId} — mapas: ${maps}. `
      + 'Escolha outro servidor jogável para trocar de host (personagens não migram entre shards).';
  }
  hint.classList.remove('is-warning');
}

/** Carrega catálogo autoritativo e sincroniza o seletor de shard na char select. */
export async function syncCharSelectServerSelector(): Promise<{ ok: boolean; message?: string }> {
  const select = document.getElementById('char-select-server-input');
  const label = document.getElementById('char-select-server-label');
  const hint = document.getElementById('char-select-server-hint');

  const listResult = await fetchAuthoritativeServerList();
  if (!listResult.ok) {
    if (hint) {
      hint.textContent = listResult.message;
      hint.classList.add('is-warning');
    }
    return listResult;
  }

  cachedServerList = listResult.list;
  const activeId = resolveCurrentServerId(listResult.list.defaultServerId);

  if (select instanceof HTMLSelectElement) {
    select.replaceChildren();
    for (const entry of listResult.list.servers) {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = formatServerOptionLabel(entry);
      option.disabled = !entry.selectable;
      select.appendChild(option);
    }
    select.value = activeId;
    select.disabled = countSelectableServers(listResult.list) <= 1;
    select.removeAttribute('aria-readonly');
  }

  const activeEntry = findServerEntryById(listResult.list.servers, activeId);
  if (label) {
    label.textContent = activeEntry
      ? `Servidor — ${activeEntry.displayName}`
      : 'Servidor';
  }

  updateServerSelectorHint(listResult.list, activeId, hint);
  return { ok: true };
}

/** Troca de shard: redirect para outro host ou recarrega hub no deploy atual. */
export function bindCharSelectServerSelector(
  onServerChanged: () => void | Promise<void>,
): void {
  if (selectorBound) return;
  selectorBound = true;

  const select = document.getElementById('char-select-server-input');
  if (!(select instanceof HTMLSelectElement)) return;

  select.addEventListener('change', () => {
    void (async () => {
      const serverId = select.value;
      const entry = cachedServerList
        ? findServerEntryById(cachedServerList.servers, serverId)
        : null;

      if (!entry) return;

      if (entry.isCurrentDeploy) {
        await onServerChanged();
        return;
      }

      if (!entry.selectable) {
        select.value = resolveCurrentServerId(cachedServerList?.defaultServerId ?? serverId);
        return;
      }

      const redirected = redirectToShardOrigin(entry);
      if (!redirected) {
        const hint = document.getElementById('char-select-server-hint');
        if (hint) {
          hint.textContent =
            `Servidor ${entry.displayName} ainda não tem URL configurada (SHARD_${entry.id.toUpperCase()}_HTTP_URL).`;
          hint.classList.add('is-warning');
        }
        select.value = resolveCurrentServerId(cachedServerList?.defaultServerId ?? serverId);
      }
    })();
  });
}
