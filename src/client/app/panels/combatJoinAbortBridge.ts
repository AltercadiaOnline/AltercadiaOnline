/**
 * Ponte WS — aborta join PvE se START_COMBAT não chegou / foi rejeitado.
 * Cliente permanece no mundo; servidor libera sessão órfã sem penalidade de fuga.
 */

type CombatJoinAbortSender = (type: 'combat-join-abort', payload: { readonly reason?: string }) => void;

type GlobalWithCombatJoinAbortBridge = typeof globalThis & {
  __ALTERCADIA_COMBAT_JOIN_ABORT_SENDER__?: CombatJoinAbortSender | null;
};

function getSenderSlot(): GlobalWithCombatJoinAbortBridge {
  return globalThis as GlobalWithCombatJoinAbortBridge;
}

export function bindCombatJoinAbortWsSender(next: CombatJoinAbortSender | null): void {
  getSenderSlot().__ALTERCADIA_COMBAT_JOIN_ABORT_SENDER__ = next;
}

export function sendCombatJoinAbort(reason?: string): boolean {
  const sender = getSenderSlot().__ALTERCADIA_COMBAT_JOIN_ABORT_SENDER__;
  if (!sender) return false;
  sender('combat-join-abort', reason ? { reason } : {});
  return true;
}
