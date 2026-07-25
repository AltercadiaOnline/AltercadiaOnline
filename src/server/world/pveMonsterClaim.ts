/**
 * Reserva de monstro PVE — quem abre a HUD primeiro segura o bicho.
 */

type MonsterClaim = {
  readonly playerId: string;
  readonly characterId: number;
  readonly phase: 'hud' | 'combat';
};

const claimByMonsterId = new Map<string, MonsterClaim>();

function isClaimOwner(
  claim: MonsterClaim,
  playerId: string,
  characterId: number,
): boolean {
  return claim.playerId === playerId && claim.characterId === characterId;
}

export function isMonsterClaimedByOther(
  monsterInstanceId: string,
  playerId: string,
  characterId: number,
): boolean {
  const claim = claimByMonsterId.get(monsterInstanceId);
  if (!claim) return false;
  return !isClaimOwner(claim, playerId, characterId);
}

export function isMonsterEncounterClaimed(monsterInstanceId: string): boolean {
  return claimByMonsterId.has(monsterInstanceId);
}

export function tryClaimMonsterForHud(
  monsterInstanceId: string,
  playerId: string,
  characterId: number,
): boolean {
  const existing = claimByMonsterId.get(monsterInstanceId);
  if (existing && !isClaimOwner(existing, playerId, characterId)) {
    return false;
  }
  claimByMonsterId.set(monsterInstanceId, {
    playerId,
    characterId,
    phase: 'hud',
  });
  return true;
}

export function markMonsterClaimInCombat(
  monsterInstanceId: string,
  playerId: string,
  characterId: number,
): void {
  claimByMonsterId.set(monsterInstanceId, {
    playerId,
    characterId,
    phase: 'combat',
  });
}

export function releaseMonsterClaimIfOwner(
  monsterInstanceId: string,
  playerId: string,
  characterId: number,
): void {
  const claim = claimByMonsterId.get(monsterInstanceId);
  if (!claim) return;
  if (!isClaimOwner(claim, playerId, characterId)) return;
  claimByMonsterId.delete(monsterInstanceId);
}

export function releasePveMonsterClaim(monsterInstanceId: string): void {
  claimByMonsterId.delete(monsterInstanceId);
}

export function __resetPveMonsterClaimsForTests(): void {
  claimByMonsterId.clear();
}
