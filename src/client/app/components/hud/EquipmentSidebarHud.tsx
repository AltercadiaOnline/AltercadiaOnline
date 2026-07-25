// @ts-nocheck
import { useEffect, useRef } from 'react';
import { buildPlayerLevelProgressionTooltip } from '../../../../shared/progression/progressionTooltipContent.js';
import { getItemById } from '../../../../shared/items/itemCatalog.js';
import { dispatchUnequipFromSlot } from '../../../ui/equipment/equipItemAction.js';
import { getPlayerItemStore } from '../../../ui/items/playerItemStore.js';
import { InventoryService } from '../../../services/index.js';
import { getContextMenuService } from '../../../ui/contextMenu/ContextMenuService.js';
import { uiEvents, UIEventType } from '../../../ui/uiEvents.js';
import { patchProgressionTooltipAttrs } from '../../../ui/tooltip/progressionTooltipAttrs.js';
import { useEquipmentSidebar } from '../../hud/useEquipmentSidebar.js';
function VitalBar({ label, value, percent, tone, ariaLabel, warning, overload, }) {
    const fillClass = [
        'vital-bar__fill',
        warning ? 'vital-bar__fill--warning' : '',
        overload ? 'vital-bar__fill--overload' : '',
    ].filter(Boolean).join(' ');
    const valueClass = [
        'vital-value',
        warning ? 'vital-value--warning' : '',
        overload ? 'vital-value--overload' : '',
    ].filter(Boolean).join(' ');
    return (<div className={label === 'CAP' ? 'vital-row vital-row--cap' : 'vital-row'}>
      <span className="vital-label">{label}</span>
      <div className={`vital-bar vital-bar--${tone}`} role="progressbar" aria-label={ariaLabel} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
        <div className={fillClass} style={{ width: `${percent}%` }}/>
      </div>
      <span className={valueClass}>{value}</span>
    </div>);
}
export function EquipmentSidebarHud() {
    const view = useEquipmentSidebar();
    const rootRef = useRef(null);
    const xpBarRef = useRef(null);
    useEffect(() => {
        const root = rootRef.current;
        if (!root)
            return;
        const dismiss = (event) => {
            if (event.button !== 0)
                return;
            getContextMenuService().close();
        };
        root.addEventListener('mousedown', dismiss);
        return () => root.removeEventListener('mousedown', dismiss);
    }, []);
    useEffect(() => {
        const bar = xpBarRef.current;
        if (!bar)
            return;
        patchProgressionTooltipAttrs(bar, buildPlayerLevelProgressionTooltip(view.profile, view.xpBar));
    }, [view.profile, view.xpBar]);
    const hpPct = view.vitals.hpMax > 0 ? (view.vitals.hpCurrent / view.vitals.hpMax) * 100 : 0;
    const ppPct = view.ppMax > 0 ? (view.ppCurrent / view.ppMax) * 100 : 0;
    const capPct = view.capacity.maxWeight > 0
        ? Math.min(100, (view.capacity.currentWeight / view.capacity.maxWeight) * 100)
        : 0;
    const handleSlotDoubleClick = (slotId) => {
        if (InventoryService.isInventoryMutationPending())
            return;
        const row = getPlayerItemStore().getItemInSlot(slotId);
        if (!row)
            return;
        dispatchUnequipFromSlot(slotId);
    };
    return (<div ref={rootRef} className="equipment-sidebar pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2">
      <header className="equipment-sidebar__header">
        <p className="equipment-sidebar__name">{view.displayName}</p>
        <p className="equipment-sidebar__level">
          Nível
          {' '}
          {view.level}
        </p>
      </header>

      <section className="equipment-sidebar__vitals" aria-label="Status vital">
        <VitalBar label="HP" tone="hp" ariaLabel="Vida" percent={hpPct} value={`${view.vitals.hpCurrent}/${view.vitals.hpMax}`}/>
        <VitalBar label="PP" tone="pp" ariaLabel="Pontos de poder" percent={ppPct} value={view.ppMax > 0 ? `${view.ppCurrent}/${view.ppMax}` : '—'}/>
        <VitalBar label="CAP" tone="cap" ariaLabel="Capacidade de carga" percent={capPct} value={view.capacity.formatted} warning={view.capacity.visualLevel === 'warning'} overload={view.capacity.visualLevel === 'overload'}/>
      </section>

      <section className="equipment-sidebar__progression" aria-label="Progressão de Nível">
        <h2 className="equipment-sidebar__stats-title">Progressão de Nível</h2>
        <p className="equipment-sidebar__progression-level">
          Nv.
          {' '}
          {view.xpBar.level}
        </p>
        <div ref={xpBarRef} className="equipment-sidebar__xp-bar" role="progressbar" aria-valuenow={view.xpBar.xpCurrent} aria-valuemax={view.xpBar.xpToNext} aria-label="Experiência até o próximo nível">
          <div className="equipment-sidebar__xp-fill" style={{ width: `${view.xpBar.percent}%` }}/>
        </div>
        <p className="equipment-sidebar__xp-text">
          {view.xpBar.xpCurrent}
          {' / '}
          {view.xpBar.xpToNext}
          {' '}
          XP
        </p>
        <p className="equipment-sidebar__xp-hint">
          Faltam
          {' '}
          {view.xpBar.remaining}
          {' '}
          XP para up
        </p>
      </section>

      <section className="equipment-sidebar__set min-h-0 flex-1" aria-label="Equipamentos">
        <h2 className="equipment-sidebar__set-title">
          SET
          {view.syncPending ? (<span className="equipment-sidebar__sync" aria-busy="true" title="Sincronizando…">
              {' '}
              ⟳
            </span>) : null}
        </h2>
        <div className="equip-grid min-h-0 overflow-y-auto">
          {view.slots.map((slot) => {
            const pending = view.syncPending;
            const filled = Boolean(slot.itemId);
            const contextMenuTarget = JSON.stringify({ slotId: slot.slotId });
            return (<button key={slot.slotId} type="button" className={[
                    'equip-slot',
                    filled ? 'equip-slot--filled' : '',
                    pending ? 'equip-slot--pending' : '',
                ].filter(Boolean).join(' ')} data-equip-slot={slot.slotId} data-item-id={slot.itemId ?? undefined} data-context-menu-kind={filled ? 'equip-slot' : undefined} data-context-menu-target={filled ? contextMenuTarget : undefined} aria-label={filled ? slot.displayName ?? slot.label : slot.label} title={filled ? undefined : slot.label} aria-busy={pending || undefined} disabled={pending} onDoubleClick={() => handleSlotDoubleClick(slot.slotId)} onMouseEnter={(event) => {
                    if (!slot.itemId)
                        return;
                    const item = getItemById(slot.itemId);
                    if (!item)
                        return;
                    uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
                        data: { kind: 'item', data: item },
                        x: event.clientX,
                        y: event.clientY,
                    });
                }} onMouseLeave={() => {
                    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
                }}>
                {!filled ? (<span className="equip-slot__placeholder">{slot.label}</span>) : (<>
                    <span className="equip-slot__icon">{slot.itemId.slice(0, 2).toUpperCase()}</span>
                    <span className="equip-slot__name">{slot.displayName}</span>
                  </>)}
                {pending ? <span className="equip-slot__pending" aria-hidden="true">⟳</span> : null}
              </button>);
        })}
        </div>
      </section>
    </div>);
}
