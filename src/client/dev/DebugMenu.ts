import { addItemToInventoryStacks } from '../../shared/character/inventoryStackOps.js';
import { ITEM_CATALOG, getItemById } from '../../shared/items/itemCatalog.js';
import { eventBus, HudEvent } from '../../shared/utils/EventBus.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { getMockEconomyService } from '../economy/economyLayer.js';
import { applyServerItemBundle } from '../game/PlayerItemSession.js';
import { getPlayerStatsGateway, type PlayerStatsSnapshot } from '../gateway/PlayerStatsGateway.js';
import { getPlayerProgressionStore } from '../progression/playerProgressionStore.js';
import { getPlayerProfileStore } from '../ui/character/playerProfileStore.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';

export type DebugMenuInitOptions = {
  readonly onLevelChanged?: (level: number) => void;
  readonly currentUserEmail?: string | null;
  readonly allowedEmails?: readonly string[];
};

type StatDelta = {
  forca: number;
  defesa: number;
};

const PANEL_ID = 'altercadia-dev-debug-menu';

let visible = false;
let statDelta: StatDelta = { forca: 0, defesa: 0 };
let onLevelChanged: ((level: number) => void) | null = null;
let statsGatewayPatched = false;
let originalRefreshStats: (() => PlayerStatsSnapshot) | null = null;

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

function resolveItemQuery(raw: string): string | null {
  const query = raw.trim();
  if (!query) return null;

  if (getItemById(query)) return query;

  const lower = query.toLowerCase();
  const exactName = ITEM_CATALOG.find((item) => item.name.toLowerCase() === lower);
  if (exactName) return exactName.id;

  const matches = ITEM_CATALOG.filter(
    (item) => item.name.toLowerCase().includes(lower) || item.id.toLowerCase().includes(lower),
  );
  if (matches.length === 1) return matches[0]!.id;
  return null;
}

function devAddItem(itemId: string): string {
  const definition = getItemById(itemId);
  if (!definition) return `Item desconhecido: ${itemId}`;

  const itemStore = getPlayerItemStore();
  const result = addItemToInventoryStacks(itemStore.toInventoryStacks(), itemId, 1);
  if (result.added <= 0) {
    return result.overflow > 0 ? 'Inventário cheio ou sem capacidade.' : 'Não foi possível adicionar o item.';
  }

  applyServerItemBundle({
    stacks: result.stacks,
    equipped: itemStore.getEquippedSlots(),
    equipmentUiGrid: itemStore.toEquipmentGrid(),
    inventoryOnly: true,
    immediate: true,
  });

  const mock = getMockEconomyService();
  if (mock && getActionDispatcher().getMode() !== 'online') {
    mock.syncInventoryStacksFromClient(itemStore.toInventoryStacks());
  }

  return `Adicionado: ${definition.name} (${itemId})`;
}

function adjustLevel(delta: number): void {
  const equipment = getPlayerEquipmentStore().getSnapshot();
  const nextLevel = Math.max(1, equipment.level + delta);
  getPlayerEquipmentStore().setPlayerInfo(equipment.displayName, nextLevel);
  getPlayerProfileStore().setLevel(nextLevel);
  onLevelChanged?.(nextLevel);
}

function adjustStat(stat: keyof StatDelta, delta: number): void {
  statDelta = {
    ...statDelta,
    [stat]: Math.max(-999, Math.min(999, statDelta[stat] + delta)),
  };
  getPlayerStatsGateway().refreshFromLocalEquipment();
}

function getPrimaryMoveId(): string | null {
  const loadout = getGlobalPlayerStore().getConfirmedLoadout();
  if (loadout.length > 0) return loadout[0]!;
  const pool = getGlobalPlayerStore().getSnapshot().availableMoveIds;
  return pool[0] ?? null;
}

function adjustMovesetMastery(delta: number): void {
  const moveId = getPrimaryMoveId();
  if (!moveId) return;

  const progressionStore = getPlayerProgressionStore();
  const snapshot = progressionStore.getSnapshot();
  const current = snapshot.movesetMastery[moveId] ?? 1;
  const next = Math.max(1, Math.min(999, current + delta));

  progressionStore.applyBattleProgressionResult(
    { ...snapshot.movesetMastery, [moveId]: next },
    snapshot.milestoneTotalProgress,
  );
}

function getMovesetMasteryValue(): number {
  const moveId = getPrimaryMoveId();
  if (!moveId) return 0;
  return getPlayerProgressionStore().getSnapshot().movesetMastery[moveId] ?? 1;
}

function ensureStatsGatewayPatch(): void {
  if (statsGatewayPatched) return;

  const gateway = getPlayerStatsGateway();
  originalRefreshStats = gateway.refreshFromLocalEquipment.bind(gateway);
  gateway.refreshFromLocalEquipment = function patchedRefreshFromLocalEquipment() {
    const base = originalRefreshStats!();
    if (statDelta.forca === 0 && statDelta.defesa === 0) return base;

    const statsBonus = {
      ...base.statsBonus,
      forca: base.statsBonus.forca + statDelta.forca,
      defesa: base.statsBonus.defesa + statDelta.defesa,
    };
    const totalStats = {
      ...base.totalStats,
      forca: base.totalStats.forca + statDelta.forca,
      defesa: base.totalStats.defesa + statDelta.defesa,
    };

    const adjusted = {
      ...base,
      statsBonus,
      totalStats,
    };

    eventBus.publish(HudEvent.PLAYER_STATS_UPDATED, {
      statsBonus: { ...statsBonus },
      speedBonusTotal: base.speedBonusTotal,
      level: getPlayerEquipmentStore().getSnapshot().level,
    });

    return adjusted;
  };

  statsGatewayPatched = true;
}

function buildStateLog(): string {
  const equipment = getPlayerEquipmentStore().getSnapshot();
  const stats = getPlayerStatsGateway().resolveSnapshot();
  const inventory = getPlayerItemStore().toInventoryStacks();
  const loadout = getGlobalPlayerStore().getConfirmedLoadout();
  const moveId = getPrimaryMoveId();
  const progression = getPlayerProgressionStore().getSnapshot();

  const inventoryLines = inventory.length === 0
    ? ['  (vazio)']
    : inventory.map((row) => `  ${row.itemId} x${row.quantity}`);

  return [
    `level: ${equipment.level}`,
    `attack (força): ${stats.totalStats.forca} (Δ ${statDelta.forca})`,
    `defense (defesa): ${stats.totalStats.defesa} (Δ ${statDelta.defesa})`,
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
  ensureStatsGatewayPatch();

  const root = document.createElement('div');
  root.id = PANEL_ID;
  root.hidden = true;
  root.style.cssText = [
    'position:fixed',
    'top:12px',
    'right:12px',
    'z-index:100050',
    'width:min(360px, calc(100vw - 24px))',
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
      <span style="opacity:0.65;font-size:11px;">D / Esc</span>
    </div>
    <section style="margin-bottom:12px;">
      <div style="opacity:0.8;margin-bottom:6px;">Inventory Testing</div>
      <div style="display:flex;gap:6px;">
        <input id="dev-debug-item-input" type="text" placeholder="item id ou nome" style="flex:1;min-width:0;padding:6px 8px;border-radius:4px;border:1px solid #444;background:#111;color:#eee;" />
        <button type="button" data-action="add-item" style="padding:6px 10px;border-radius:4px;border:1px solid #555;background:#1f1f1f;color:#eee;cursor:pointer;">Add Item</button>
      </div>
      <div id="dev-debug-item-feedback" style="margin-top:6px;min-height:16px;color:#9fd89f;"></div>
    </section>
    <section style="margin-bottom:12px;">
      <div style="opacity:0.8;margin-bottom:6px;">Stats Modifier</div>
      <div id="dev-debug-stat-rows"></div>
    </section>
    <section>
      <div style="opacity:0.8;margin-bottom:6px;">State Logger</div>
      <pre id="dev-debug-state-log" style="margin:0;padding:8px;border-radius:4px;background:rgba(255,255,255,0.05);white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;"></pre>
    </section>
  `;

  document.body.appendChild(root);

  const itemInput = root.querySelector<HTMLInputElement>('#dev-debug-item-input')!;
  const itemFeedback = root.querySelector<HTMLDivElement>('#dev-debug-item-feedback')!;
  const stateLog = root.querySelector<HTMLPreElement>('#dev-debug-state-log')!;
  const statRows = root.querySelector<HTMLDivElement>('#dev-debug-stat-rows')!;

  const statControls: Array<{ label: string; onMinus: () => void; onPlus: () => void; readValue: () => string }> = [
    {
      label: 'Level',
      onMinus: () => adjustLevel(-1),
      onPlus: () => adjustLevel(1),
      readValue: () => String(getPlayerEquipmentStore().getSnapshot().level),
    },
    {
      label: 'Attack',
      onMinus: () => adjustStat('forca', -1),
      onPlus: () => adjustStat('forca', 1),
      readValue: () => String(getPlayerStatsGateway().resolveSnapshot().totalStats.forca),
    },
    {
      label: 'Defense',
      onMinus: () => adjustStat('defesa', -1),
      onPlus: () => adjustStat('defesa', 1),
      readValue: () => String(getPlayerStatsGateway().resolveSnapshot().totalStats.defesa),
    },
    {
      label: 'Moveset',
      onMinus: () => adjustMovesetMastery(-1),
      onPlus: () => adjustMovesetMastery(1),
      readValue: () => String(getMovesetMasteryValue()),
    },
  ];

  const refreshUi = (): void => {
    stateLog.textContent = buildStateLog();
    for (const row of statControls) {
      const valueEl = root.querySelector<HTMLSpanElement>(`[data-stat-value="${row.label}"]`);
      if (valueEl) valueEl.textContent = row.readValue();
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
  ];

  const setVisible = (next: boolean): void => {
    visible = next;
    root.hidden = !next;
    if (next) {
      refreshUi();
      itemInput.focus();
      itemInput.select();
    }
  };

  const toggleVisible = (): void => {
    setVisible(!visible);
  };

  const onAddItem = (): void => {
    const resolvedId = resolveItemQuery(itemInput.value);
    if (!resolvedId) {
      itemFeedback.style.color = '#f5a8a8';
      itemFeedback.textContent = 'Item não encontrado — use id ou nome exato/único.';
      return;
    }
    itemFeedback.style.color = '#9fd89f';
    itemFeedback.textContent = devAddItem(resolvedId);
    refreshUi();
  };

  root.querySelector<HTMLButtonElement>('[data-action="add-item"]')!.addEventListener('click', onAddItem);
  itemInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onAddItem();
    }
  });

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape' && visible) {
      event.preventDefault();
      setVisible(false);
      return;
    }

    if (event.code !== 'KeyD' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
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

  console.info('[DebugMenu] Ativo — tecla D para abrir/fechar (Esc fecha).');

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

/** HUD de debug para progressão/inventário — remover a chamada em main.ts para publicar. */
export function initDebugMenu(options?: DebugMenuInitOptions): () => void {
  teardownMenu?.();
  teardownMenu = mountDebugMenu(options);
  return teardownMenu;
}

export function destroyDebugMenu(): void {
  teardownMenu?.();
  teardownMenu = null;
}
