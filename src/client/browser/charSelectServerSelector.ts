import {
  fetchAuthoritativeServerList,
  findServerEntryById,
} from '../services/serverListClient.js';
import { resolveActiveServerId } from '../auth/resolveLoginServerId.js';
import { redirectToShardOrigin } from '../net/shardRedirect.js';
import { isReactCharSelectScreenEnabled } from '../app/shell/screenSurface.js';
import type { ServerListResponse } from '../../shared/world/serverListProtocol.js';

let cachedServerList: ServerListResponse | null = null;
let selectorBound = false;
let lastServerUiState: CharSelectServerUiState | null = null;
let lastServerSyncError: string | null = null;

export type CharSelectServerOption = {
  readonly id: string;
  readonly label: string;
  readonly disabled: boolean;
};

export type CharSelectServerUiState = {
  readonly ok: boolean;
  readonly message?: string;
  readonly options: readonly CharSelectServerOption[];
  readonly activeId: string;
  readonly label: string;
  readonly hint: string;
  readonly hintWarning: boolean;
  readonly selectorDisabled: boolean;
};

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
  hint.textContent = buildServerHint(list, activeId);
  hint.classList.remove('is-warning');
}

function buildServerHint(list: ServerListResponse, activeId: string): string {
  const active = findServerEntryById(list.servers, activeId);
  const maps = active?.mapIds.join(', ') ?? '—';
  const selectableCount = countSelectableServers(list);

  if (selectableCount <= 1) {
    return (
      `Shard: ${active?.displayName ?? activeId} — mapas: ${maps}. `
      + 'Personagens são vinculados permanentemente a este servidor na criação.'
    );
  }

  return (
    `Servidor atual: ${active?.displayName ?? activeId} — mapas: ${maps}. `
    + 'Escolha outro servidor jogável para trocar de host (personagens não migram entre shards).'
  );
}

function buildServerUiState(
  list: ServerListResponse,
  activeId: string,
): CharSelectServerUiState {
  const activeEntry = findServerEntryById(list.servers, activeId);
  return {
    ok: true,
    options: list.servers.map((entry) => ({
      id: entry.id,
      label: formatServerOptionLabel(entry),
      disabled: !entry.selectable,
    })),
    activeId,
    label: activeEntry ? `Servidor — ${activeEntry.displayName}` : 'Servidor',
    hint: buildServerHint(list, activeId),
    hintWarning: false,
    selectorDisabled: countSelectableServers(list) <= 1,
  };
}

export function getCharSelectServerUiState(): CharSelectServerUiState | null {
  if (lastServerUiState) return lastServerUiState;
  if (lastServerSyncError) {
    return {
      ok: false,
      message: lastServerSyncError,
      options: [],
      activeId: '',
      label: 'Servidor',
      hint: lastServerSyncError,
      hintWarning: true,
      selectorDisabled: true,
    };
  }
  return null;
}

function applyServerUiStateToDom(state: CharSelectServerUiState): void {
  if (isReactCharSelectScreenEnabled()) return;

  const select = document.getElementById('char-select-server-input');
  const label = document.getElementById('char-select-server-label');
  const hint = document.getElementById('char-select-server-hint');

  if (select instanceof HTMLSelectElement && state.options.length > 0) {
    select.replaceChildren();
    for (const option of state.options) {
      const el = document.createElement('option');
      el.value = option.id;
      el.textContent = option.label;
      el.disabled = option.disabled;
      select.appendChild(el);
    }
    select.value = state.activeId;
    select.disabled = state.selectorDisabled;
    select.removeAttribute('aria-readonly');
  }

  if (label) {
    label.textContent = state.label;
  }

  if (hint) {
    hint.textContent = state.hint;
    hint.classList.toggle('is-warning', state.hintWarning);
  }
}

/** Carrega catálogo autoritativo e sincroniza o seletor de shard na char select. */
export async function syncCharSelectServerSelector(): Promise<{ ok: boolean; message?: string }> {
  const listResult = await fetchAuthoritativeServerList();
  if (!listResult.ok) {
    lastServerSyncError = listResult.message ?? 'Erro ao carregar servidores.';
    lastServerUiState = null;
    applyServerUiStateToDom(getCharSelectServerUiState()!);
    return listResult;
  }

  cachedServerList = listResult.list;
  lastServerSyncError = null;
  const activeId = resolveCurrentServerId(listResult.list.defaultServerId);
  lastServerUiState = buildServerUiState(listResult.list, activeId);
  applyServerUiStateToDom(lastServerUiState);
  return { ok: true };
}

export async function handleCharSelectServerChange(
  serverId: string,
  onCurrentDeployChanged: () => void | Promise<void>,
): Promise<void> {
  const entry = cachedServerList
    ? findServerEntryById(cachedServerList.servers, serverId)
    : null;

  if (!entry) return;

  if (entry.isCurrentDeploy) {
    await onCurrentDeployChanged();
    return;
  }

  if (!entry.selectable) {
    const fallbackId = resolveCurrentServerId(cachedServerList?.defaultServerId ?? serverId);
    if (lastServerUiState) {
      lastServerUiState = { ...lastServerUiState, activeId: fallbackId };
    }
    return;
  }

  const redirected = redirectToShardOrigin(entry);
  if (!redirected) {
    const fallbackId = resolveCurrentServerId(cachedServerList?.defaultServerId ?? serverId);
    lastServerUiState = {
      ...(lastServerUiState ?? {
        ok: true,
        options: [],
        activeId: fallbackId,
        label: 'Servidor',
        hint: '',
        hintWarning: false,
        selectorDisabled: true,
      }),
      activeId: fallbackId,
      hint:
        `Servidor ${entry.displayName} ainda não tem URL configurada (SHARD_${entry.id.toUpperCase()}_HTTP_URL).`,
      hintWarning: true,
    };
  }
}

/** Troca de shard: redirect para outro host ou recarrega hub no deploy atual. */
export function bindCharSelectServerSelector(
  onServerChanged: () => void | Promise<void>,
): void {
  if (isReactCharSelectScreenEnabled()) return;
  if (selectorBound) return;
  selectorBound = true;

  const select = document.getElementById('char-select-server-input');
  if (!(select instanceof HTMLSelectElement)) return;

  select.addEventListener('change', () => {
    void handleCharSelectServerChange(select.value, onServerChanged);
  });
}
