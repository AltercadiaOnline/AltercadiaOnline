import { Player, type PlayerSessionStatus } from './Player.js';

const sessions = new Map<string, Player>();

function sessionKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

export function getOrCreatePlayerSession(playerId: string, characterId: number): Player {
  const key = sessionKey(playerId, characterId);
  let player = sessions.get(key);
  if (!player) {
    player = new Player(playerId, characterId, 0, 0);
    sessions.set(key, player);
  }
  return player;
}

export function setPlayerSessionStatus(
  playerId: string,
  characterId: number,
  status: PlayerSessionStatus,
): void {
  const player = getOrCreatePlayerSession(playerId, characterId);
  if (status === 'BATTLE') {
    player.enterCombat();
    return;
  }
  if (status === 'LOGOUT') {
    player.startLogout();
    return;
  }
  player.enterExploration();
}

export function getPlayerSessionStatus(
  playerId: string,
  characterId: number,
): PlayerSessionStatus {
  return getOrCreatePlayerSession(playerId, characterId).status;
}

export function clearPlayerSession(playerId: string, characterId: number): void {
  sessions.delete(sessionKey(playerId, characterId));
}

export function resetPlayerSessionRegistry(): void {
  sessions.clear();
}

export function isPlayerInBattle(playerId: string, characterId: number): boolean {
  return getPlayerSessionStatus(playerId, characterId) === 'BATTLE';
}

export function setPlayerInBattle(playerId: string, characterId: number, inBattle: boolean): void {
  const player = getOrCreatePlayerSession(playerId, characterId);
  if (inBattle) {
    player.enterCombat();
    return;
  }
  player.exitCombat();
}

export function setPlayerLoggingOut(playerId: string, characterId: number, loggingOut: boolean): void {
  const player = getOrCreatePlayerSession(playerId, characterId);
  if (loggingOut) {
    player.startLogout();
    return;
  }
  player.enterExploration();
}
