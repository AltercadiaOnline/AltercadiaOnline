import type { PlayerHonorGivenPayload } from '../../../shared/combat/playerHonorTypes.js';

type HonorSender = (payload: PlayerHonorGivenPayload) => void;

let sender: HonorSender | null = null;

export function registerPlayerHonorSender(next: HonorSender | null): void {
  sender = next;
}

export function sendPlayerHonorGiven(payload: PlayerHonorGivenPayload): boolean {
  if (!sender) {
    console.warn('[PlayerHonor] Socket não configurado — honor não enviado.');
    return false;
  }
  sender(payload);
  return true;
}
