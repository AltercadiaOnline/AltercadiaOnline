/**
 * Ponte WS para encontro PVE — evita import circular gameSession ↔ React HUD.
 *
 * Sender em globalThis: o bundle tsc (`/client`) faz bind e o React HUD (`/app-ui`)
 * dispara o mesmo slot — sem isso, Aceitar falha com sender null → INVALID_MESSAGE.
 */

import { resolvePlayerEquippedSkillIds } from '../../../shared/combat/movesetLoadout.js';
import { getActiveCharacterClassId } from '../../character/activeCharacterIdentity.js';
import { getGlobalPlayerStore } from '../../ui/moveset/globalPlayerStore.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';

type PveEncounterAcceptPayload = {
  readonly monsterInstanceId: string;
  readonly activeMovesets?: readonly string[];
};

type PveEncounterSender = (
  type: 'pve-encounter-accept' | 'pve-encounter-flee' | 'pve-encounter-request',
  payload: PveEncounterAcceptPayload | { readonly monsterInstanceId: string },
) => void;

type GlobalWithPveEncounterBridge = typeof globalThis & {
  __ALTERCADIA_PVE_ENCOUNTER_SENDER__?: PveEncounterSender | null;
};

function getSenderSlot(): GlobalWithPveEncounterBridge {
  return globalThis as GlobalWithPveEncounterBridge;
}

function resolveConfirmedActiveMovesets(): string[] {
  const classId =
    getActiveCharacterClassId()
    || getPlayerEquipmentStore().getSnapshot().classId
    || 'IMPETUS';
  return resolvePlayerEquippedSkillIds(
    classId,
    getGlobalPlayerStore().getConfirmedLoadout(),
  );
}

export function bindPveEncounterWsSender(next: PveEncounterSender | null): void {
  getSenderSlot().__ALTERCADIA_PVE_ENCOUNTER_SENDER__ = next;
}

export function sendPveEncounterAccept(monsterInstanceId: string): boolean {
  const sender = getSenderSlot().__ALTERCADIA_PVE_ENCOUNTER_SENDER__;
  if (!sender) return false;
  const activeMovesets = resolveConfirmedActiveMovesets();
  sender('pve-encounter-accept', {
    monsterInstanceId,
    ...(activeMovesets.length > 0 ? { activeMovesets } : {}),
  });
  return true;
}

export function sendPveEncounterFlee(monsterInstanceId: string): boolean {
  const sender = getSenderSlot().__ALTERCADIA_PVE_ENCOUNTER_SENDER__;
  if (!sender) return false;
  sender('pve-encounter-flee', { monsterInstanceId });
  return true;
}

/** Tecla E / interação — pede a mesma HUD do aggro (servidor valida). */
export function sendPveEncounterRequest(monsterInstanceId: string): boolean {
  const sender = getSenderSlot().__ALTERCADIA_PVE_ENCOUNTER_SENDER__;
  if (!sender) return false;
  sender('pve-encounter-request', { monsterInstanceId });
  return true;
}
