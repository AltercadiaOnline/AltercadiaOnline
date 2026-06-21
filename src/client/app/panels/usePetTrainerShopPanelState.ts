import { useMemo, useState } from 'react';
import {
  getPetDefinition,
  PET_KIND_ORDER,
  type PetKindId,
} from '../../../shared/pet/petCatalog.js';
import {
  getDefaultPetColorId,
  type PetColorId,
} from '../../../shared/pet/petColorPalette.js';
import {
  getDefaultPetGenderId,
  type PetGenderId,
} from '../../../shared/pet/petGender.js';
import { resolvePetPurchaseQuote } from '../../../shared/economy/petTrainerService.js';
import { getPlayerPetStore } from '../../ui/pet/playerPetStore.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';
import { usePlayerData } from '../store/gameStore.js';

export type PetTrainerShopView = {
  readonly vendorId: string;
  readonly vendorName: string;
};

export function resolvePetTrainerFromContext(
  context: WorldPanelContext,
): PetTrainerShopView {
  if (context.kind === 'petTrainerShop') {
    return {
      vendorId: context.vendorId,
      vendorName: context.vendorName,
    };
  }
  return { vendorId: 'treinador_zeno', vendorName: 'Treinador Zeno' };
}

export function usePetTrainerShopPanelState(vendor: PetTrainerShopView) {
  const { gold } = usePlayerData();
  const [selectedKind, setSelectedKind] = useState<PetKindId | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [petName, setPetName] = useState('');
  const [selectedColor, setSelectedColor] = useState<PetColorId | null>(null);
  const [selectedGender, setSelectedGender] = useState<PetGenderId>(getDefaultPetGenderId());

  const roster = useMemo(
    () => getPlayerPetStore().getRoster(),
    [gold.dollarVolt],
  );

  const ownedKinds = useMemo(() => {
    const set = new Set<PetKindId>();
    for (const pet of roster.pets) {
      set.add(pet.kindId);
    }
    return set;
  }, [roster.pets]);

  const isKindOwned = (kindId: PetKindId): boolean => ownedKinds.has(kindId);

  const selectedDefinition = selectedKind ? getPetDefinition(selectedKind) : null;
  const selectedQuote = selectedKind ? resolvePetPurchaseQuote(selectedKind) : null;
  const canPurchase = Boolean(selectedKind && !isKindOwned(selectedKind));

  const selectKind = (kindId: PetKindId) => {
    if (isKindOwned(kindId)) return;
    setSelectedKind(kindId);
  };

  const openCustomize = () => {
    if (!selectedKind || isKindOwned(selectedKind)) return;
    setCustomizeOpen(true);
    setSelectedColor(getDefaultPetColorId(selectedKind));
    setSelectedGender(getDefaultPetGenderId());
    const def = getPetDefinition(selectedKind);
    if (!petName.trim()) setPetName(def.name);
  };

  const backToCatalog = () => {
    setCustomizeOpen(false);
  };

  const effectiveColor = selectedKind
    ? (selectedColor ?? getDefaultPetColorId(selectedKind))
    : null;

  const effectiveName = petName.trim()
    || (selectedKind ? getPetDefinition(selectedKind).name : '');

  return {
    vendor,
    gold,
    roster,
    kindOrder: PET_KIND_ORDER,
    selectedKind,
    selectedDefinition,
    selectedQuote,
    customizeOpen,
    petName,
    selectedColor: effectiveColor,
    selectedGender,
    canPurchase,
    isKindOwned,
    selectKind,
    openCustomize,
    backToCatalog,
    setPetName,
    setSelectedColor,
    setSelectedGender,
    effectiveName,
  };
}
