import { useEffect, useState } from 'react';
import type { PlayerPetRosterSnapshot } from '../../../shared/pet/petRoster.js';
import { getPlayerPetStore } from '../../ui/pet/playerPetStore.js';
import type { PetRationFeedAvailability } from '../../../shared/pet/petRationFeed.js';

export type PetLovePanelState = {
  readonly roster: PlayerPetRosterSnapshot;
  readonly rationCharges: number;
  readonly feedAvailability: PetRationFeedAvailability;
  readonly affectionCanUse: boolean;
  readonly affectionRemainingMs: number;
};

export function usePetLovePanelState(
  feedInlineError: string | null,
): PetLovePanelState {
  const [roster, setRoster] = useState<PlayerPetRosterSnapshot>(
    () => getPlayerPetStore().getRoster(),
  );
  const [rationCharges, setRationCharges] = useState(
    () => getPlayerPetStore().getRationCharges(),
  );
  const [feedAvailability, setFeedAvailability] = useState(
    () => getPlayerPetStore().getPetRationFeedAvailability(),
  );
  const [affectionAvailability, setAffectionAvailability] = useState(
    () => getPlayerPetStore().getPetAffectionAvailability(),
  );

  useEffect(() => {
    const unsubRoster = getPlayerPetStore().subscribeRoster(setRoster);
    const unsubRation = getPlayerPetStore().subscribeRationCharges(setRationCharges);

    const syncAvailability = (): void => {
      setFeedAvailability(getPlayerPetStore().getPetRationFeedAvailability());
      setAffectionAvailability(getPlayerPetStore().getPetAffectionAvailability());
    };

    syncAvailability();
    const cooldownTimer = window.setInterval(syncAvailability, 30_000);

    return () => {
      unsubRoster();
      unsubRation();
      window.clearInterval(cooldownTimer);
    };
  }, []);

  useEffect(() => {
    if (feedInlineError?.includes('Sem cargas') && rationCharges > 0) {
      setFeedAvailability(getPlayerPetStore().getPetRationFeedAvailability());
    }
  }, [feedInlineError, rationCharges]);

  return {
    roster,
    rationCharges,
    feedAvailability,
    affectionCanUse: affectionAvailability.canAffect,
    affectionRemainingMs: affectionAvailability.remainingMs,
  };
}
