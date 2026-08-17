import { useEffect, useMemo, useState } from 'react';
import {
  getPetDefinition,
  PET_KIND_ORDER,
  type PetKindId,
} from '../../../shared/pet/petCatalog.js';
import { getDefaultPetColorId } from '../../../shared/pet/petColorPalette.js';
import {
  getDefaultPetGenderId,
  type PetGenderId,
} from '../../../shared/pet/petGender.js';
import { resolvePetPurchaseQuote } from '../../../shared/economy/petTrainerService.js';
import type { PlayerPetRosterSnapshot } from '../../../shared/pet/petRoster.js';
import { getPlayerPetStore } from '../../ui/pet/playerPetStore.js';
import { getPlayerWalletStore } from '../../ui/wallet/playerWalletStore.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';
import { usePlayerGold } from '../store/gameStore.js';

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
  return { vendorId: 'treinador_zeno', vendorName: 'Treinadora Zena' };
}

export function usePetTrainerShopPanelState(vendor: PetTrainerShopView) {
  const gold = usePlayerGold();
  const [walletVolts, setWalletVolts] = useState(
    () => getPlayerWalletStore().getSnapshot().dollarVolt,
  );
  const [roster, setRoster] = useState<PlayerPetRosterSnapshot>(
    () => getPlayerPetStore().getRoster(),
  );
  const [selectedKind, setSelectedKind] = useState<PetKindId | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [petName, setPetName] = useState('');
  const [selectedGender, setSelectedGender] = useState<PetGenderId>(getDefaultPetGenderId());

  useEffect(() => {
    const unsubRoster = getPlayerPetStore().subscribeRoster(setRoster);
    const unsubWallet = getPlayerWalletStore().subscribe((snapshot) => {
      setWalletVolts(snapshot.dollarVolt);
    });
    return () => {
      unsubRoster();
      unsubWallet();
    };
  }, []);

  const ownedKinds = useMemo(() => {
    const set = new Set<PetKindId>();
    for (const pet of roster.pets) {
      set.add(pet.kindId);
    }
    return set;
  }, [roster.pets]);

  const isKindOwned = (kindId: PetKindId): boolean => ownedKinds.has(kindId);

  const firstAvailableKind = useMemo(
    () => PET_KIND_ORDER.find((kindId) => !ownedKinds.has(kindId)) ?? null,
    [ownedKinds],
  );

  useEffect(() => {
    setSelectedKind((current) => {
      if (current && !ownedKinds.has(current)) return current;
      return firstAvailableKind;
    });
  }, [firstAvailableKind, ownedKinds]);

  const selectedDefinition = selectedKind ? getPetDefinition(selectedKind) : null;
  const selectedQuote = selectedKind ? resolvePetPurchaseQuote(selectedKind) : null;
  const canPurchase = Boolean(
    selectedKind
    && !isKindOwned(selectedKind)
    && walletVolts >= (selectedQuote?.priceVolts ?? Number.POSITIVE_INFINITY),
  );

  const selectKind = (kindId: PetKindId) => {
    if (isKindOwned(kindId)) return;
    setSelectedKind(kindId);
  };

  const openCustomize = () => {
    if (!selectedKind || isKindOwned(selectedKind)) return;
    setCustomizeOpen(true);
    setSelectedGender(getDefaultPetGenderId());
    const def = getPetDefinition(selectedKind);
    if (!petName.trim()) setPetName(def.name);
  };

  const backToCatalog = () => {
    setCustomizeOpen(false);
  };

  const effectiveColor = selectedKind ? getDefaultPetColorId(selectedKind) : null;

  const effectiveName = petName.trim()
    || (selectedKind ? getPetDefinition(selectedKind).name : '');

  return {
    vendor,
    gold,
    walletVolts,
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
    firstAvailableKind,
    isKindOwned,
    selectKind,
    openCustomize,
    backToCatalog,
    setPetName,
    setSelectedGender,
    effectiveName,
  };
}
