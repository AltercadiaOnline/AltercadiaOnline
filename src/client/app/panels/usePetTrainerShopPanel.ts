// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPetDefinition, TREINADOR_ZENO_NPC, } from '../../../shared/pet/petCatalog.js';
import { getDefaultPetColorId, } from '../../../shared/pet/petColorPalette.js';
import { getDefaultPetGenderId, } from '../../../shared/pet/petGender.js';
import { validatePetPurchase } from '../../../shared/economy/petTrainerService.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPlayerPetStore } from '../../ui/pet/playerPetStore.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { getPendingIntentRegistry } from '../../sync/pendingIntentRegistry.js';
import { closeHudWindow } from './panelWindowActions.js';
import { buildPetTrainerShopBodyHtml, createDefaultPetTrainerGender, } from '../../ui/pet/renderPetTrainerShopView.js';
import { paintPetTrainerShopPreviews } from '../../ui/pet/paintPetTrainerShopPreviews.js';
import { getNpcPanelContextBridge } from '../bridge/npcPanelContextBridge.js';
const DEFAULT_VENDOR = {
    vendorId: TREINADOR_ZENO_NPC,
    vendorName: 'Treinador Zeno',
};
export function usePetTrainerShopPanel(enabled) {
    const [vendor, setVendor] = useState(DEFAULT_VENDOR);
    const [wallet, setWallet] = useState(() => getDataStore().getWallet());
    const [ownedKinds, setOwnedKinds] = useState(() => new Set());
    const [rosterCount, setRosterCount] = useState(0);
    const [selectedKind, setSelectedKind] = useState(null);
    const [customizeOpen, setCustomizeOpen] = useState(false);
    const [petName, setPetName] = useState('');
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedGender, setSelectedGender] = useState(() => createDefaultPetTrainerGender());
    const bodyRef = useRef(null);
    const refreshRoster = useCallback(() => {
        const roster = getPlayerPetStore().getRoster();
        setRosterCount(roster.pets.length);
        setOwnedKinds(new Set(roster.pets.map((pet) => pet.kindId)));
    }, []);
    const viewModel = useMemo(() => ({
        vendor,
        wallet,
        ownedKinds,
        rosterCount,
        selectedKind,
        customizeOpen,
        petName,
        selectedColor,
        selectedGender,
    }), [
        vendor,
        wallet,
        ownedKinds,
        rosterCount,
        selectedKind,
        customizeOpen,
        petName,
        selectedColor,
        selectedGender,
    ]);
    const bodyHtml = useMemo(() => buildPetTrainerShopBodyHtml(viewModel), [viewModel]);
    const bodyClassName = customizeOpen
        ? 'pet-trainer-shop__body pet-trainer-shop__body--customize'
        : 'pet-trainer-shop__body';
    useEffect(() => {
        if (!enabled)
            return;
        return getNpcPanelContextBridge().subscribe((snapshot) => {
            if (snapshot.petTrainerShop) {
                setVendor({ ...snapshot.petTrainerShop });
                setSelectedKind(null);
                setCustomizeOpen(false);
                setPetName('');
                setSelectedColor(null);
                setSelectedGender(createDefaultPetTrainerGender());
                refreshRoster();
            }
        });
    }, [enabled, refreshRoster]);
    useEffect(() => {
        if (!enabled)
            return;
        setWallet(getDataStore().getWallet());
        refreshRoster();
        const unsubWallet = getDataStore().subscribe('wallet', setWallet);
        const unsubPets = getPlayerPetStore().subscribe(refreshRoster);
        return () => {
            unsubWallet();
            unsubPets();
        };
    }, [enabled, refreshRoster]);
    useEffect(() => {
        if (!enabled)
            return;
        paintPetTrainerShopPreviews(bodyRef.current, {
            customizeOpen,
            selectedKind,
            selectedColor,
            selectedGender,
        });
    }, [enabled, bodyHtml, customizeOpen, selectedKind, selectedColor, selectedGender]);
    useEffect(() => {
        if (!enabled)
            return;
        return () => {
            const snapshot = endWorldHudInteractionSession();
            if (snapshot) {
                uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
            }
        };
    }, [enabled]);
    const isKindOwned = useCallback((kindId) => ownedKinds.has(kindId), [ownedKinds]);
    const openCustomizeStep = useCallback(() => {
        if (!selectedKind || isKindOwned(selectedKind))
            return;
        setCustomizeOpen(true);
        setSelectedColor(getDefaultPetColorId(selectedKind));
        setSelectedGender(getDefaultPetGenderId());
        const def = getPetDefinition(selectedKind);
        setPetName((current) => (current.trim() ? current : def.name));
    }, [isKindOwned, selectedKind]);
    const purchaseSelected = useCallback(() => {
        if (!selectedKind)
            return;
        const colorId = selectedColor ?? getDefaultPetColorId(selectedKind);
        const nameInput = bodyRef.current?.querySelector('[data-pet-name-input]');
        const name = nameInput?.value.trim() || petName.trim() || getPetDefinition(selectedKind).name;
        const validation = validatePetPurchase({
            vendorId: vendor.vendorId,
            kindId: selectedKind,
            name,
            colorId,
            gender: selectedGender,
            walletVolts: wallet.dollarVolt,
            ownedPetCount: rosterCount,
        });
        if (!validation.ok) {
            alertSystem(validation.reason);
            return;
        }
        const result = getActionDispatcher().dispatch({
            type: 'PURCHASE_PET',
            payload: {
                vendorId: vendor.vendorId,
                kindId: selectedKind,
                name: validation.adoption.name,
                colorId: validation.adoption.colorId,
                gender: validation.adoption.gender,
            },
        });
        if (!result.ok) {
            alertSystem(result.reason);
            return;
        }
        if (result.status === 'applied') {
            alertSystem(`${validation.adoption.name} adotado com sucesso!`);
            closeHudWindow('petTrainerShop');
            return;
        }
        if (result.status === 'pending') {
            const registry = getPendingIntentRegistry();
            const finalize = () => {
                if (registry.isIntentPending(result.intentId))
                    return;
                off();
                if (isKindOwned(selectedKind) || getPlayerPetStore().getRoster().pets.some((pet) => pet.kindId === selectedKind)) {
                    alertSystem(`${validation.adoption.name} adotado com sucesso!`);
                    closeHudWindow('petTrainerShop');
                }
            };
            const off = registry.subscribeChange(finalize);
            finalize();
        }
    }, [
        isKindOwned,
        petName,
        rosterCount,
        selectedColor,
        selectedGender,
        selectedKind,
        vendor.vendorId,
        wallet.dollarVolt,
    ]);
    const handleClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof Element))
            return;
        if (target.closest('[data-action="back-catalog"]')) {
            setCustomizeOpen(false);
            return;
        }
        if (target.closest('[data-action="open-customize"]')) {
            openCustomizeStep();
            return;
        }
        if (target.closest('[data-action="confirm-buy"]')) {
            purchaseSelected();
            return;
        }
        const colorBtn = target.closest('[data-pet-color]');
        if (colorBtn?.dataset.petColor) {
            setSelectedColor(colorBtn.dataset.petColor);
            return;
        }
        const genderBtn = target.closest('[data-pet-gender]');
        if (genderBtn?.dataset.petGender) {
            setSelectedGender(genderBtn.dataset.petGender);
            return;
        }
        const card = target.closest('[data-pet-kind]');
        if (card?.dataset.petKind) {
            if (card.classList.contains('pet-trainer-card--owned'))
                return;
            setSelectedKind(card.dataset.petKind);
        }
    }, [openCustomizeStep, purchaseSelected]);
    const handleInput = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement))
            return;
        if (target.matches('[data-pet-name-input]')) {
            setPetName(target.value);
        }
    }, []);
    return {
        vendor,
        bodyHtml,
        bodyClassName,
        bodyRef,
        handleClick,
        handleInput,
    };
}
