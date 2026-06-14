/** Honra acumulada por ator — substituível por persistência autoritativa. */
const honorByActor = new Map<string, number>();

export function grantPlayerHonor(recipientActorId: string): number {
  const next = (honorByActor.get(recipientActorId) ?? 0) + 1;
  honorByActor.set(recipientActorId, next);
  return next;
}

export function readPlayerHonorCount(recipientActorId: string): number {
  return honorByActor.get(recipientActorId) ?? 0;
}
