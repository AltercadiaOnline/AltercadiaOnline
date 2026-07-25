// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getPlayerPetStore } from '../../ui/pet/playerPetStore.js';
import { isRosterSelectionOnlyChange } from '../../../shared/pet/petRoster.js';
import { renderPetLoveActivateControl, renderPetLoveRosterHud, } from '../../ui/pet/petLoveRosterView.js';
import { formatPetAffectionCooldown } from '../../../shared/pet/petAffection.js';
import { postSystemNotification } from '../../ui/logService.js';
const AFFECTION_COOLDOWN_TICK_MS = 30_000;
function renderAffectionActions(roster) {
    const pet = roster.pets[roster.selectedSlotIndex];
    if (!pet) {
        return `
      <div class="pet-love-panel__actions-col pet-love-panel__actions-col--right" data-pet-affection-col>
        <p class="pet-love-panel__actions-placeholder">Selecione um companheiro para carinho.</p>
      </div>
    `;
    }
    const store = getPlayerPetStore();
    const availability = store.getPetAffectionAvailability();
    const label = `Fazer carinho em ${pet.name}`;
    if (availability.canAffect) {
        return `
      <div class="pet-love-panel__actions-col pet-love-panel__actions-col--right" data-pet-affection-col>
        <button type="button" class="pet-love-panel__affection-btn" data-action="pet-affection" aria-label="${label}">
          ${label}
        </button>
      </div>
    `;
    }
    const cooldownLabel = formatPetAffectionCooldown(availability.remainingMs);
    return `
    <div class="pet-love-panel__actions-col pet-love-panel__actions-col--right" data-pet-affection-col>
      <button type="button" class="pet-love-panel__affection-btn pet-love-panel__affection-btn--cooldown" data-action="pet-affection" disabled aria-label="${label} — disponível em ${cooldownLabel}">
        ${label}
      </button>
      <p class="pet-love-panel__affection-hint">Próximo carinho em ${cooldownLabel}</p>
    </div>
  `;
}
function buildBodyHtml(roster, feedInlineError) {
    const feedAvailability = getPlayerPetStore().getPetRationFeedAvailability();
    const rationCharges = getPlayerPetStore().getRationCharges();
    return `
    ${renderPetLoveRosterHud(roster, feedAvailability, rationCharges, feedInlineError)}
    <div class="pet-love-panel__actions">
      <div class="pet-love-panel__actions-col">
        ${renderPetLoveActivateControl(roster, roster.pets[roster.selectedSlotIndex] ?? null)}
      </div>
      ${renderAffectionActions(roster)}
    </div>
  `;
}
export function usePetLovePanel(enabled) {
    const [roster, setRoster] = useState(() => getPlayerPetStore().getRoster());
    const [feedInlineError, setFeedInlineError] = useState(null);
    const [tick, setTick] = useState(0);
    const affectionTimerRef = useRef(null);
    const rationTimerRef = useRef(null);
    const refresh = useCallback(() => {
        setRoster(getPlayerPetStore().getRoster());
        setTick((value) => value + 1);
    }, []);
    useEffect(() => {
        if (!enabled)
            return;
        setRoster(getPlayerPetStore().getRoster());
        setFeedInlineError(null);
        const unsubRoster = getPlayerPetStore().subscribeRoster((next) => {
            setRoster((prev) => {
                if (isRosterSelectionOnlyChange(prev, next)) {
                    setFeedInlineError(null);
                }
                return next;
            });
            refresh();
        });
        const unsubRation = getPlayerPetStore().subscribeRationCharges((charges) => {
            setFeedInlineError((prev) => (prev?.includes('Sem cargas') && charges > 0 ? null : prev));
            refresh();
        });
        affectionTimerRef.current = setInterval(() => {
            const availability = getPlayerPetStore().getPetAffectionAvailability();
            if (availability.canAffect) {
                refresh();
            }
            else {
                setTick((value) => value + 1);
            }
        }, AFFECTION_COOLDOWN_TICK_MS);
        rationTimerRef.current = setInterval(() => {
            const availability = getPlayerPetStore().getPetRationFeedAvailability();
            if (availability.canFeed) {
                refresh();
            }
            else {
                setTick((value) => value + 1);
            }
        }, AFFECTION_COOLDOWN_TICK_MS);
        return () => {
            unsubRoster();
            unsubRation();
            if (affectionTimerRef.current)
                clearInterval(affectionTimerRef.current);
            if (rationTimerRef.current)
                clearInterval(rationTimerRef.current);
        };
    }, [enabled, refresh]);
    const bodyHtml = useMemo(() => buildBodyHtml(roster, feedInlineError), [feedInlineError, roster, tick]);
    const handleClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        const slotButton = target.closest('[data-pet-slot]');
        const slotRaw = slotButton?.dataset.petSlot;
        const slotIndex = slotRaw !== undefined ? Number(slotRaw) : Number.NaN;
        if (target.dataset.action === 'pet-select-slot' && Number.isFinite(slotIndex)) {
            getPlayerPetStore().selectPetSlot(slotIndex);
            return;
        }
        if (target.dataset.action === 'pet-activate' && Number.isFinite(slotIndex)) {
            const store = getPlayerPetStore();
            if (store.activatePetSlot(slotIndex)) {
                const pet = store.getRoster().pets[slotIndex];
                postSystemNotification(pet ? `${pet.name} está convocado.` : 'Companheiro ativado.', 'normal');
            }
            return;
        }
        if (target.dataset.action === 'pet-deactivate') {
            getPlayerPetStore().deactivateAllPets();
            postSystemNotification('Companheiro guardado.', 'normal');
            return;
        }
        if (target.dataset.action === 'pet-affection') {
            const result = getPlayerPetStore().applyPetAffection();
            if (!result.ok) {
                const cooldown = formatPetAffectionCooldown(result.remainingMs);
                postSystemNotification(cooldown
                    ? `Você já fez carinho. Próximo em ${cooldown}.`
                    : result.reason, 'normal');
                refresh();
                return;
            }
            const petName = roster.pets[roster.selectedSlotIndex]?.name ?? 'seu pet';
            postSystemNotification(`Carinho em ${petName}! +${(result.xpGained * 100).toFixed(2)}% de afinidade.`, 'normal');
            refresh();
            return;
        }
        if (target.dataset.action === 'pet-feed-ration') {
            const result = getActionDispatcher().dispatch({
                type: 'PET_FEED_SPECIAL_RATION',
                payload: { slotIndex: roster.selectedSlotIndex },
            });
            if (!result.ok) {
                if (result.reason.includes('Sem cargas')) {
                    setFeedInlineError(result.reason);
                }
                else {
                    postSystemNotification(result.reason, 'normal');
                }
            }
            else {
                setFeedInlineError(null);
            }
            refresh();
        }
    }, [refresh, roster.pets, roster.selectedSlotIndex]);
    return { bodyHtml, handleClick };
}
