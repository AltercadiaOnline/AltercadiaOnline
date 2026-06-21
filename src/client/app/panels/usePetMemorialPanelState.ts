import { useEffect, useState } from 'react';
import { getPetMemorialStore } from '../../ui/pet/petMemorialStore.js';
import type { PetMemorialBookSnapshot } from '../../../shared/pet/petMemorial.js';

export function usePetMemorialPanelState(): PetMemorialBookSnapshot {
  const [snapshot, setSnapshot] = useState(() => getPetMemorialStore().getSnapshot());

  useEffect(() => getPetMemorialStore().subscribe(setSnapshot), []);

  return snapshot;
}
