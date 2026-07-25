import { ITEM_CATALOG, getItemById } from '../../shared/items/itemCatalog.js';
import {
  getClassMoveById,
  isClassMoveId,
} from '../../shared/combat/classMovesetCatalog.js';
import {
  clampMoveMasteryXp,
  MOVE_MAX_LEVEL,
  resolveMoveProgressionFromMastery,
  totalMasteryXpForLevel,
} from '../../shared/progression/moveProgression.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { initializePlayerState } from '../player/initializePlayerState.js';
import { getPlayerStatsGateway } from '../gateway/PlayerStatsGateway.js';
import { getPlayerProgressionStore } from '../progression/playerProgressionStore.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { getGlobalStateSynchronizer } from '../sync/GlobalStateSynchronizer.js';
import { getPlayerWalletStore } from '../ui/wallet/playerWalletStore.js';
import { AppScreens } from '../browser/appScreens.js';

export type DebugMenuInitOptions = {
  readonly onLevelChanged?: (level: number) => void;
  readonly currentUserEmail?: string | null;
  readonly allowedEmails?: readonly string[];
};

const PANEL_ID = 'altercadia-dev-debug-menu';

let visible = false;
let onLevelChanged: ((level: number) => void) | null = null;

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function isDebugEmailAllowed(
  currentUserEmail: string | null | undefined,
  allowedEmails: readonly string[] | undefined,
): boolean {
  const current = normalizeEmail(currentUserEmail);
  if (!current || !allowedEmails || allowedEmails.length === 0) return false;

  return allowedEmails
    .map((email) => normalizeEmail(email))
    .some((email) => email === current);
}

type DebugCatalogHit = {
  readonly id: string;
  readonly name: string;
};

function normalizeItemSearch(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR');
}

/** Busca no catálogo completo — mesmo padrão do Marketplace (nome ou id). */
function filterCatalogHits(rawQuery: string): readonly DebugCatalogHit[] {
  const query = normalizeItemSearch(rawQuery);
  const hits = ITEM_CATALOG
    .filter((item) => {
      if (!query) return true;
      return (
        item.name.toLocaleLowerCase('pt-BR').includes(query)
        || item.id.toLocaleLowerCase('pt-BR').includes(query)
      );
    })
    .map((item) => ({ id: item.id, name: item.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return hits;
}

function resolveItemIconSrc(itemId: string): string {
  return `/assets/items/${encodeURIComponent(itemId)}.png`;
}

function parseGrantQuantity(raw: string): number {
  const value = Math.floor(Number(raw));
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(value, 999);
}

function requireDispatcherReady(): string | null {
  const mode = getActionDispatcher().getMode();
  if (mode === 'online' || mode === 'mock' || mode === 'local') {
    return null;
  }
  return 'Dispatcher indisponível — aguarde o boot do GAME_MODE.';
}

function dispatchDevGrantItem(itemId: string, quantity = 1): string {
  const definition = getItemById(itemId);
  if (!definition) return `Item desconhecido: ${itemId}`;

  const offline = requireDispatcherReady();
  if (offline) return offline;

  const qty = Math.max(1, Math.min(999, Math.floor(quantity)));
  const result = getActionDispatcher().dispatch({
    type: 'DEV_GRANT_ITEM',
    payload: { itemId, quantity: qty },
  });
  if (!result.ok) return result.reason;
  return `+${qty} ${definition.name} (${itemId}) → inventário [${getActionDispatcher().getMode()}].`;
}

function dispatchDevGrantCurrency(volts: number, alterCoins: number): string {
  const offline = requireDispatcherReady();
  if (offline) return offline;

  const result = getActionDispatcher().dispatch({
    type: 'DEV_GRANT_CURRENCY',
    payload: { volts, alterCoins },
  });
  if (!result.ok) return result.reason;
  return `Intent: +${volts} VOLTS / +${alterCoins} Alter — via ActionDispatcher (${getActionDispatcher().getMode()}).`;
}

function dispatchDevSetLevel(level: number): string {
  const offline = requireDispatcherReady();
  if (offline) return offline;

  const result = getActionDispatcher().dispatch({
    type: 'DEV_SET_LEVEL',
    payload: { level },
  });
  if (!result.ok) return result.reason;

  onLevelChanged?.(level);
  if (getActionDispatcher().getMode() === 'online') {
    getGlobalStateSynchronizer().requestFullState();
  }
  return `Intent: nível ${level} — via ActionDispatcher (${getActionDispatcher().getMode()}).`;
}

function dispatchDevResetPlayer(): string {
  const selected = AppScreens.getSelectedCharacter();
  initializePlayerState({
    ...(selected?.name ? { displayName: selected.name } : {}),
    ...(selected?.class ? { classId: selected.class } : {}),
    requestServerSync: false,
  });

  const offline = requireDispatcherReady();
  if (offline) {
    return `${offline} Espelho local zerado.`;
  }

  const result = getActionDispatcher().dispatch({
    type: 'DEV_RESET_PLAYER',
    payload: {},
  });
  if (!result.ok) return result.reason;

  if (getActionDispatcher().getMode() === 'online') {
    getGlobalStateSynchronizer().requestFullState();
  }
  onLevelChanged?.(1);
  return `Reset Local Data — via ActionDispatcher (${getActionDispatcher().getMode()}).`;
}

function adjustLevel(delta: number): void {
  const equipment = getPlayerEquipmentStore().getSnapshot();
  const nextLevel = Math.max(1, equipment.level + delta);
  dispatchDevSetLevel(nextLevel);
}

function getPrimaryMoveId(): string | null {
  const loadout = getGlobalPlayerStore().getConfirmedLoadout();
  if (loadout.length > 0) return loadout[0]!;
  const pool = getGlobalPlayerStore().getSnapshot().availableMoveIds;
  return pool[0] ?? null;
}

function listDebugMoveIds(): readonly string[] {
  const store = getGlobalPlayerStore().getSnapshot();
  const ids = new Set<string>();
  for (const id of store.confirmedLoadout) ids.add(id);
  for (const id of store.activeMovesets) ids.add(id);
  for (const id of store.availableMoveIds) ids.add(id);
  const masteryKeys = Object.keys(getPlayerProgressionStore().getSnapshot().movesetMastery);
  for (const id of masteryKeys) ids.add(id);
  return [...ids].sort((a, b) => a.localeCompare(b));
}

function resolveMoveDebugLabel(moveId: string): string {
  if (isClassMoveId(moveId)) {
    return getClassMoveById(moveId).name;
  }
  return moveId;
}

function getMoveMasteryLevel(moveId: string): number {
  const xp = getPlayerProgressionStore().getSnapshot().movesetMastery[moveId] ?? 0;
  return resolveMoveProgressionFromMastery(moveId, xp).level;
}

function getMovesetMasteryValue(): number {
  const moveId = getPrimaryMoveId();
  if (!moveId) return 0;
  return getPlayerProgressionStore().getSnapshot().movesetMastery[moveId] ?? 1;
}

function dispatchDevSetMovesetMastery(moveId: string, level: number): string {
  const offline = requireDispatcherReady();
  if (offline) return offline;

  const capped = Math.max(1, Math.min(MOVE_MAX_LEVEL, Math.floor(level)));
  const result = getActionDispatcher().dispatch({
    type: 'DEV_SET_MOVESET_MASTERY',
    payload: { moveId, level: capped },
  });
  if (!result.ok) return result.reason;

  // Local/mock já aplica no processAction; online confirma via intent-result + full-state.
  if (getActionDispatcher().getMode() === 'online' && result.status === 'pending') {
    // Optimistic mirror — servidor confirma em seguida.
    const masteryXp = clampMoveMasteryXp(totalMasteryXpForLevel(capped));
    getPlayerProgressionStore().setMoveMasteryXp(moveId, masteryXp);
  }

  return `${resolveMoveDebugLabel(moveId)} → domínio Nv.${capped} [${getActionDispatcher().getMode()}].`;
}

function adjustMoveMastery(moveId: string, delta: number): string {
  const next = getMoveMasteryLevel(moveId) + delta;
  return dispatchDevSetMovesetMastery(moveId, next);
}

function buildStateLog(): string {
  const equipment = getPlayerEquipmentStore().getSnapshot();
  const stats = getPlayerStatsGateway().resolveSnapshot();
  const inventory = getPlayerItemStore().toInventoryStacks();
  const loadout = getGlobalPlayerStore().getConfirmedLoadout();
  const moveId = getPrimaryMoveId();
  const progression = getPlayerProgressionStore().getSnapshot();
  const wallet = getPlayerWalletStore().getSnapshot();

  const inventoryLines = inventory.length === 0
    ? ['  (vazio)']
    : inventory.map((row) => `  ${row.itemId} x${row.quantity}`);

  return [
    `dispatcher: ${getActionDispatcher().getMode()}`,
    `level: ${equipment.level}`,
    `wallet: ${wallet.dollarVolt} VOLTS / ${wallet.alterCoins} Alter`,
    `attack (força): ${stats.totalStats.forca}`,
    `defense (defesa): ${stats.totalStats.defesa}`,
    `moveset: ${loadout.join(', ') || '(nenhum)'}`,
    `moveset mastery [${moveId ?? '—'}]: ${getMovesetMasteryValue()}`,
    `milestone progress: ${progression.milestoneTotalProgress}`,
    `inventory (${inventory.length} stacks):`,
    ...inventoryLines,
  ].join('\n');
}

function isTypingInForeignField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest(`#${PANEL_ID}`)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function mountDebugMenu(options?: DebugMenuInitOptions): () => void {
  if (typeof document === 'undefined') return () => undefined;

  if (!isDebugEmailAllowed(options?.currentUserEmail, options?.allowedEmails)) {
    console.info('[DebugMenu] Bloqueado — e-mail da sessão não está autorizado.');
    return () => undefined;
  }

  onLevelChanged = options?.onLevelChanged ?? null;

  const root = document.createElement('div');
  root.id = PANEL_ID;
  root.hidden = true;
  root.style.cssText = [
    'position:fixed',
    'top:12px',
    'right:12px',
    'z-index:100050',
    'width:min(420px, calc(100vw - 24px))',
    'max-height:calc(100vh - 24px)',
    'overflow:auto',
    'padding:12px',
    'border:1px solid rgba(255,255,255,0.18)',
    'border-radius:8px',
    'background:rgba(0,0,0,0.78)',
    'color:#e8e8e8',
    'font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    'box-shadow:0 8px 28px rgba(0,0,0,0.45)',
    'pointer-events:auto',
  ].join(';');

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
      <strong style="font-size:13px;letter-spacing:0.04em;">DEV DEBUG MENU</strong>
      <span style="opacity:0.65;font-size:11px;">Shift+D / Esc</span>
    </div>
    <p style="margin:0 0 10px;opacity:0.7;font-size:11px;">
      Digite o nome/id → clique no item → cai no inventário (ActionDispatcher).
    </p>
    <section style="margin-bottom:12px;">
      <div style="opacity:0.8;margin-bottom:6px;">Inventory Testing</div>
      <label style="display:block;opacity:0.65;font-size:11px;margin-bottom:4px;">Buscar no catálogo</label>
      <div style="display:flex;gap:6px;align-items:center;">
        <input id="dev-debug-item-input" type="search" placeholder="Nome do item…" autocomplete="off" style="flex:1;min-width:0;padding:6px 8px;border-radius:4px;border:1px solid #444;background:#111;color:#eee;" />
        <input id="dev-debug-item-qty" type="number" min="1" max="999" value="1" title="Quantidade" style="width:56px;padding:6px 6px;border-radius:4px;border:1px solid #444;background:#111;color:#eee;" />
      </div>
      <div id="dev-debug-item-count" style="margin-top:4px;opacity:0.55;font-size:11px;"></div>
      <div id="dev-debug-item-results" role="listbox" aria-label="Resultados do catálogo" style="margin-top:6px;max-height:220px;overflow:auto;border:1px solid rgba(255,255,255,0.12);border-radius:4px;background:rgba(0,0,0,0.35);"></div>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button type="button" data-action="add-volts" style="flex:1;padding:6px 8px;border-radius:4px;border:1px solid #555;background:#1f1f1f;color:#eee;cursor:pointer;">+100 VOLTS</button>
        <button type="button" data-action="add-alter" style="flex:1;padding:6px 8px;border-radius:4px;border:1px solid #555;background:#1f1f1f;color:#eee;cursor:pointer;">+10 Alter</button>
      </div>
      <button type="button" data-action="reset-local" style="width:100%;margin-top:6px;padding:6px 8px;border-radius:4px;border:1px solid #844;background:#2a1515;color:#f0c0c0;cursor:pointer;">Reset Local Data</button>
      <div id="dev-debug-item-feedback" style="margin-top:6px;min-height:16px;color:#9fd89f;"></div>
    </section>
    <section style="margin-bottom:12px;">
      <div style="opacity:0.8;margin-bottom:6px;">Stats Modifier</div>
      <div id="dev-debug-stat-rows"></div>
    </section>
    <section style="margin-bottom:12px;">
      <div style="opacity:0.8;margin-bottom:6px;">Moveset Mastery</div>
      <p style="margin:0 0 6px;opacity:0.65;font-size:11px;">+/− sobe ou desce o domínio do move (ActionDispatcher).</p>
      <div id="dev-debug-moveset-rows" style="display:flex;flex-direction:column;gap:4px;max-height:200px;overflow:auto;"></div>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button type="button" data-action="mastery-all-plus" style="flex:1;padding:6px 8px;border-radius:4px;border:1px solid #555;background:#1f1f1f;color:#eee;cursor:pointer;">Todos +1</button>
        <button type="button" data-action="mastery-all-plus5" style="flex:1;padding:6px 8px;border-radius:4px;border:1px solid #555;background:#1f1f1f;color:#eee;cursor:pointer;">Todos +5</button>
      </div>
    </section>
    <section>
      <div style="opacity:0.8;margin-bottom:6px;">State Logger</div>
      <pre id="dev-debug-state-log" style="margin:0;padding:8px;border-radius:4px;background:rgba(255,255,255,0.05);white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;"></pre>
    </section>
  `;

  document.body.appendChild(root);

  const itemInput = root.querySelector<HTMLInputElement>('#dev-debug-item-input')!;
  const itemQtyInput = root.querySelector<HTMLInputElement>('#dev-debug-item-qty')!;
  const itemResults = root.querySelector<HTMLDivElement>('#dev-debug-item-results')!;
  const itemCount = root.querySelector<HTMLDivElement>('#dev-debug-item-count')!;
  const itemFeedback = root.querySelector<HTMLDivElement>('#dev-debug-item-feedback')!;
  const stateLog = root.querySelector<HTMLPreElement>('#dev-debug-state-log')!;
  const statRows = root.querySelector<HTMLDivElement>('#dev-debug-stat-rows')!;
  const movesetRows = root.querySelector<HTMLDivElement>('#dev-debug-moveset-rows')!;

  const setFeedback = (message: string, ok = true): void => {
    itemFeedback.style.color = ok ? '#9fd89f' : '#f5a8a8';
    itemFeedback.textContent = message;
  };

  const grantItem = (itemId: string): void => {
    const quantity = parseGrantQuantity(itemQtyInput.value);
    setFeedback(dispatchDevGrantItem(itemId, quantity));
    refreshUi();
  };

  const renderItemResults = (): void => {
    const hits = filterCatalogHits(itemInput.value);
    itemCount.textContent = hits.length === 0
      ? 'Nenhum item encontrado.'
      : `${hits.length} item${hits.length === 1 ? '' : 's'} — clique para adicionar`;

    itemResults.replaceChildren();

    if (hits.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:10px 8px;opacity:0.55;text-align:center;';
      empty.textContent = 'Sem resultados para essa busca.';
      itemResults.appendChild(empty);
      return;
    }

    for (const hit of hits) {
      const row = document.createElement('button');
      row.type = 'button';
      row.role = 'option';
      row.dataset.itemId = hit.id;
      row.style.cssText = [
        'display:flex',
        'align-items:center',
        'gap:8px',
        'width:100%',
        'padding:6px 8px',
        'border:0',
        'border-bottom:1px solid rgba(255,255,255,0.06)',
        'background:transparent',
        'color:#e8e8e8',
        'text-align:left',
        'cursor:pointer',
        'font:inherit',
      ].join(';');

      const icon = document.createElement('img');
      icon.src = resolveItemIconSrc(hit.id);
      icon.alt = '';
      icon.width = 24;
      icon.height = 24;
      icon.loading = 'lazy';
      icon.decoding = 'async';
      icon.style.cssText = 'width:24px;height:24px;object-fit:contain;flex-shrink:0;image-rendering:pixelated;background:rgba(255,255,255,0.04);border-radius:3px;';
      icon.addEventListener('error', () => {
        icon.style.visibility = 'hidden';
      });

      const textWrap = document.createElement('span');
      textWrap.style.cssText = 'display:flex;flex-direction:column;min-width:0;flex:1;gap:1px;';

      const nameEl = document.createElement('span');
      nameEl.textContent = hit.name;
      nameEl.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

      const idEl = document.createElement('span');
      idEl.textContent = hit.id;
      idEl.style.cssText = 'opacity:0.5;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

      textWrap.append(nameEl, idEl);
      row.append(icon, textWrap);

      row.addEventListener('mouseenter', () => {
        row.style.background = 'rgba(255,255,255,0.08)';
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = 'transparent';
      });
      row.addEventListener('click', () => {
        grantItem(hit.id);
      });

      itemResults.appendChild(row);
    }
  };

  const statControls: Array<{ label: string; onMinus: () => void; onPlus: () => void; readValue: () => string }> = [
    {
      label: 'Level',
      onMinus: () => adjustLevel(-1),
      onPlus: () => adjustLevel(1),
      readValue: () => String(getPlayerEquipmentStore().getSnapshot().level),
    },
  ];

  const refreshUi = (): void => {
    stateLog.textContent = buildStateLog();
    for (const row of statControls) {
      const valueEl = root.querySelector<HTMLSpanElement>(`[data-stat-value="${row.label}"]`);
      if (valueEl) valueEl.textContent = row.readValue();
    }
    renderMovesetRows();
  };

  const renderMovesetRows = (): void => {
    const moveIds = listDebugMoveIds();
    movesetRows.replaceChildren();

    if (moveIds.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:8px;opacity:0.55;';
      empty.textContent = 'Nenhum move no loadout/pool — confirme o moveset no painel.';
      movesetRows.appendChild(empty);
      return;
    }

    for (const moveId of moveIds) {
      const level = getMoveMasteryLevel(moveId);
      const line = document.createElement('div');
      line.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
      line.innerHTML = `
        <span style="min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${moveId}">
          ${resolveMoveDebugLabel(moveId)}
          <span style="opacity:0.45;font-size:10px;margin-left:4px;">${moveId}</span>
        </span>
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
          <button type="button" data-mastery-delta="-5" style="width:28px;height:26px;border-radius:4px;border:1px solid #555;background:#1a1a1a;color:#eee;cursor:pointer;">−5</button>
          <button type="button" data-mastery-delta="-1" style="width:28px;height:26px;border-radius:4px;border:1px solid #555;background:#1a1a1a;color:#eee;cursor:pointer;">−</button>
          <span data-mastery-level style="min-width:36px;text-align:center;">${level}</span>
          <button type="button" data-mastery-delta="1" style="width:28px;height:26px;border-radius:4px;border:1px solid #555;background:#1a1a1a;color:#eee;cursor:pointer;">+</button>
          <button type="button" data-mastery-delta="5" style="width:28px;height:26px;border-radius:4px;border:1px solid #555;background:#1a1a1a;color:#eee;cursor:pointer;">+5</button>
        </div>
      `;

      for (const button of line.querySelectorAll<HTMLButtonElement>('[data-mastery-delta]')) {
        button.addEventListener('click', () => {
          const delta = Number(button.dataset.masteryDelta);
          setFeedback(adjustMoveMastery(moveId, delta));
          refreshUi();
        });
      }

      movesetRows.appendChild(line);
    }
  };

  for (const row of statControls) {
    const line = document.createElement('div');
    line.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;';
    line.innerHTML = `
      <span style="min-width:72px;">${row.label}</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <button type="button" data-stat-minus="${row.label}" style="width:28px;height:28px;border-radius:4px;border:1px solid #555;background:#1a1a1a;color:#eee;cursor:pointer;">−</button>
        <span data-stat-value="${row.label}" style="min-width:42px;text-align:center;">${row.readValue()}</span>
        <button type="button" data-stat-plus="${row.label}" style="width:28px;height:28px;border-radius:4px;border:1px solid #555;background:#1a1a1a;color:#eee;cursor:pointer;">+</button>
      </div>
    `;
    statRows.appendChild(line);
    line.querySelector<HTMLButtonElement>(`[data-stat-minus="${row.label}"]`)!.addEventListener('click', () => {
      row.onMinus();
      refreshUi();
    });
    line.querySelector<HTMLButtonElement>(`[data-stat-plus="${row.label}"]`)!.addEventListener('click', () => {
      row.onPlus();
      refreshUi();
    });
  }

  getPlayerStatsGateway().attach();

  const unsubscribers: Array<() => void> = [
    getPlayerEquipmentStore().subscribe(() => refreshUi()),
    getPlayerItemStore().subscribe(() => refreshUi()),
    getGlobalPlayerStore().subscribe(() => refreshUi()),
    getPlayerProgressionStore().subscribe(() => refreshUi()),
    getPlayerWalletStore().subscribe(() => refreshUi()),
  ];

  const setVisible = (next: boolean): void => {
    visible = next;
    root.hidden = !next;
    if (next) {
      refreshUi();
      renderItemResults();
      itemInput.focus();
      itemInput.select();
    }
  };

  const toggleVisible = (): void => {
    setVisible(!visible);
  };

  root.querySelector<HTMLButtonElement>('[data-action="add-volts"]')!.addEventListener('click', () => {
    setFeedback(dispatchDevGrantCurrency(100, 0));
    refreshUi();
  });
  root.querySelector<HTMLButtonElement>('[data-action="add-alter"]')!.addEventListener('click', () => {
    setFeedback(dispatchDevGrantCurrency(0, 10));
    refreshUi();
  });
  root.querySelector<HTMLButtonElement>('[data-action="reset-local"]')!.addEventListener('click', () => {
    setFeedback(dispatchDevResetPlayer());
    refreshUi();
  });

  root.querySelector<HTMLButtonElement>('[data-action="mastery-all-plus"]')!.addEventListener('click', () => {
    const ids = listDebugMoveIds();
    if (ids.length === 0) {
      setFeedback('Nenhum move para upar.', false);
      return;
    }
    let last = '';
    for (const moveId of ids) {
      last = adjustMoveMastery(moveId, 1);
    }
    setFeedback(last || `+1 domínio em ${ids.length} moves.`);
    refreshUi();
  });

  root.querySelector<HTMLButtonElement>('[data-action="mastery-all-plus5"]')!.addEventListener('click', () => {
    const ids = listDebugMoveIds();
    if (ids.length === 0) {
      setFeedback('Nenhum move para upar.', false);
      return;
    }
    let last = '';
    for (const moveId of ids) {
      last = adjustMoveMastery(moveId, 5);
    }
    setFeedback(last || `+5 domínio em ${ids.length} moves.`);
    refreshUi();
  });

  itemInput.addEventListener('input', () => {
    renderItemResults();
  });

  itemInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const hits = filterCatalogHits(itemInput.value);
    if (hits.length === 0) {
      setFeedback('Nenhum item para adicionar — refine a busca.', false);
      return;
    }
    grantItem(hits[0]!.id);
  });

  renderItemResults();

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape' && visible) {
      event.preventDefault();
      setVisible(false);
      return;
    }

    if (
      event.code !== 'KeyD'
      || !event.shiftKey
      || event.repeat
      || event.ctrlKey
      || event.metaKey
      || event.altKey
    ) {
      return;
    }

    if (isTypingInForeignField(event.target)) return;

    if (event.target instanceof HTMLInputElement && event.target.id === 'dev-debug-item-input') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleVisible();
  };

  window.addEventListener('keydown', onKeyDown, true);
  refreshUi();

  console.info('[DebugMenu] Ativo — Shift+D. Grants via ActionDispatcher/online intents.');

  return () => {
    window.removeEventListener('keydown', onKeyDown, true);
    for (const unsubscribe of unsubscribers) {
      if (typeof unsubscribe === 'function') unsubscribe();
    }
    root.remove();
    visible = false;
    onLevelChanged = null;
  };
}

let teardownMenu: (() => void) | null = null;

/** HUD de debug — grants usam o mesmo canal online (player-intent). */
export function initDebugMenu(options?: DebugMenuInitOptions): () => void {
  teardownMenu?.();
  teardownMenu = mountDebugMenu(options);
  return teardownMenu;
}

export function destroyDebugMenu(): void {
  teardownMenu?.();
  teardownMenu = null;
}
