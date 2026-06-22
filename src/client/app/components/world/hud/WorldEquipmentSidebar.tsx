import { useCallback, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import {
  EQUIPMENT_UI_SLOT_LABELS,
  EQUIPMENT_UI_SLOT_ORDER,
  type EquipmentUiSlotId,
} from '../../../../../shared/character/equipmentUiSlots.js';
import { resolveCharacterLevelXpBar } from '../../../../../shared/character/characterLevelProgression.js';
import { resolveLoadoutPpBudget } from '../../../../../shared/combat/loadoutPpBudget.js';
import { emitItemTooltip } from '../../../../ui/tooltip/emitItemTooltip.js';
import {
  InventoryService,
  isSyncPending,
  selectPlayerEquipment,
} from '../../../../services/index.js';
import { dispatchUnequipFromSlot } from '../../../../ui/equipment/equipItemAction.js';
import { getPlayerEquipmentStore } from '../../../../ui/equipment/playerEquipmentStore.js';
import { getPlayerItemStore } from '../../../../ui/items/playerItemStore.js';
import { getGlobalPlayerStore } from '../../../../ui/moveset/globalPlayerStore.js';
import { getContextMenuService } from '../../../../ui/contextMenu/ContextMenuService.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import {
  useCarryCapacitySnapshot,
  useConfirmedLoadoutKey,
  useEquipmentGridRevision,
  usePlayerEquipmentSnapshot,
  usePlayerProfileSnapshot,
} from '../../../hooks/usePlayerHudStores.js';
import { buildProgressionTooltipDataAttributes } from './progressionTooltipProps.js';

function EquipSlotButton({
  slotId,
  itemId,
  pending,
}: {
  slotId: EquipmentUiSlotId;
  itemId: string | null;
  pending: boolean;
}) {
  const label = EQUIPMENT_UI_SLOT_LABELS[slotId];
  const displayStore = getPlayerEquipmentStore();
  const displayName = itemId ? displayStore.getItemDisplayName(itemId) : label;
  const pendingClass = pending ? ' equip-slot--pending' : '';
  const contextTarget = JSON.stringify({ slotId });

  const handleDoubleClick = useCallback(() => {
    if (InventoryService.isInventoryMutationPending() || !itemId) return;
    const row = getPlayerItemStore().getItemInSlot(slotId);
    if (!row) return;
    dispatchUnequipFromSlot(slotId);
  }, [itemId, slotId]);

  const showTooltip = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!itemId) return;
    emitItemTooltip(itemId, event.clientX, event.clientY);
  }, [itemId]);

  const hideTooltip = useCallback(() => {
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }, []);

  return (
    <button
      type="button"
      className={`equip-slot${itemId ? ' equip-slot--filled' : ''}${pendingClass}`}
      data-equip-slot={slotId}
      {...(itemId
        ? {
            'data-item-id': itemId,
            'data-context-menu-kind': 'equip-slot',
            'data-context-menu-target': contextTarget,
          }
        : {})}
      aria-label={displayName}
      title={itemId ? undefined : label}
      aria-busy={pending || undefined}
      disabled={pending || undefined}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={itemId ? showTooltip : undefined}
      onMouseLeave={itemId ? hideTooltip : undefined}
    >
      {itemId ? (
        <>
          <span className="equip-slot__placeholder" hidden>{label}</span>
          <span className="equip-slot__icon">{itemId.slice(0, 2).toUpperCase()}</span>
          <span className="equip-slot__name">{displayName}</span>
        </>
      ) : (
        <>
          <span className="equip-slot__placeholder">{label}</span>
          <span className="equip-slot__icon" hidden />
          <span className="equip-slot__name" hidden />
        </>
      )}
      {pending ? <span className="equip-slot__pending" aria-hidden="true">⟳</span> : null}
    </button>
  );
}

export function WorldEquipmentSidebar({ interactive = true }: { readonly interactive?: boolean }) {
  const equipment = usePlayerEquipmentSnapshot();
  const profile = usePlayerProfileSnapshot();
  const capacity = useCarryCapacitySnapshot();
  useConfirmedLoadoutKey();
  useEquipmentGridRevision();

  const rootRef = useRef<HTMLDivElement>(null);
  const pending = isSyncPending();
  const equippedItems = selectPlayerEquipment();
  const loadout = getGlobalPlayerStore().getConfirmedLoadout();
  const { ppCurrent, ppMax } = resolveLoadoutPpBudget(loadout);
  const xpBar = resolveCharacterLevelXpBar(profile.level, profile.xpCurrent);
  const progressionTooltipAttrs = buildProgressionTooltipDataAttributes(profile, xpBar);

  const hpPct = equipment.vitals.hpMax > 0
    ? (equipment.vitals.hpCurrent / equipment.vitals.hpMax) * 100
    : 0;
  const ppPct = ppMax > 0 ? (ppCurrent / ppMax) * 100 : 0;
  const capPct = capacity.maxWeight > 0
    ? Math.min(100, (capacity.currentWeight / capacity.maxWeight) * 100)
    : 0;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const dismiss = (event: globalThis.MouseEvent): void => {
      if (event.button !== 0) return;
      getContextMenuService().close();
    };

    root.addEventListener('mousedown', dismiss);
    return () => root.removeEventListener('mousedown', dismiss);
  }, []);

  return (
    <div
      ref={rootRef}
      className="equipment-sidebar equipment-sidebar__mount"
      aria-label="Equipamentos e status"
      style={interactive ? undefined : { pointerEvents: 'none' }}
    >
      <header className="equipment-sidebar__header">
        <p className="equipment-sidebar__name">{profile.displayName}</p>
        <p className="equipment-sidebar__level">Nível {profile.level}</p>
      </header>

      <section className="equipment-sidebar__vitals" aria-label="Status vital">
        <div className="vital-row">
          <span className="vital-label">HP</span>
          <div className="vital-bar vital-bar--hp" role="progressbar" aria-label="Vida">
            <div className="vital-bar__fill" style={{ width: `${hpPct}%` }} />
          </div>
          <span className="vital-value">
            {equipment.vitals.hpCurrent}/{equipment.vitals.hpMax}
          </span>
        </div>
        <div className="vital-row">
          <span className="vital-label">PP</span>
          <div
            className="vital-bar vital-bar--pp"
            role="progressbar"
            aria-label="Pontos de poder"
            aria-valuenow={ppCurrent}
            aria-valuemax={ppMax}
          >
            <div className="vital-bar__fill" style={{ width: `${ppPct}%` }} />
          </div>
          <span className="vital-value">{ppMax > 0 ? `${ppCurrent}/${ppMax}` : '—'}</span>
        </div>
        <div className="vital-row vital-row--cap">
          <span className="vital-label">CAP</span>
          <div className="vital-bar vital-bar--cap" role="progressbar" aria-label="Capacidade de carga">
            <div
              className={[
                'vital-bar__fill',
                capacity.visualLevel === 'overload' ? 'vital-bar__fill--overload' : '',
                capacity.visualLevel === 'warning' ? 'vital-bar__fill--warning' : '',
              ].filter(Boolean).join(' ')}
              style={{ width: `${capPct}%` }}
            />
          </div>
          <span
            className={[
              'vital-value',
              capacity.visualLevel === 'overload' ? 'vital-value--overload' : '',
              capacity.visualLevel === 'warning' ? 'vital-value--warning' : '',
            ].filter(Boolean).join(' ')}
          >
            {capacity.formatted}
          </span>
        </div>
      </section>

      <section className="equipment-sidebar__progression" aria-label="Progressão de Nível">
        <h2 className="equipment-sidebar__stats-title">Progressão de Nível</h2>
        <div data-equip-progression>
          <p className="equipment-sidebar__progression-level">Nv. {xpBar.level}</p>
          <div
            className="equipment-sidebar__xp-bar"
            role="progressbar"
            aria-valuenow={xpBar.xpCurrent}
            aria-valuemax={xpBar.xpToNext}
            aria-label="Experiência até o próximo nível"
            {...progressionTooltipAttrs}
          >
            <div className="equipment-sidebar__xp-fill" style={{ width: `${xpBar.percent}%` }} />
          </div>
          <p className="equipment-sidebar__xp-text">
            {xpBar.xpCurrent} / {xpBar.xpToNext} XP
          </p>
          <p className="equipment-sidebar__xp-hint">Faltam {xpBar.remaining} XP para up</p>
        </div>
      </section>

      <section className="equipment-sidebar__set" aria-label="Equipamentos">
        <h2 className="equipment-sidebar__set-title">
          SET
          {pending ? (
            <span className="equipment-sidebar__sync" aria-busy="true" title="Sincronizando…"> ⟳</span>
          ) : null}
        </h2>
        <div className="equip-grid" data-equip-grid>
          {EQUIPMENT_UI_SLOT_ORDER.map((slotId) => {
            const row = equippedItems.find((item) => item.slot === slotId);
            return (
              <EquipSlotButton
                key={slotId}
                slotId={slotId}
                itemId={row?.itemId ?? null}
                pending={pending}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
