import type { FriendPresenceUpdate } from '../../shared/social/friendListTypes.js';
import { hasFriend } from './friendListStore.js';

export type WorldSessionRef = {
  readonly connectionId: string;
  readonly playerId: string;
  readonly characterId: number;
};

type FriendPresenceDeliverer = (
  connectionId: string,
  update: FriendPresenceUpdate,
) => void;

type WorldSessionLister = () => readonly WorldSessionRef[];

let deliverer: FriendPresenceDeliverer | null = null;
let listWorldSessions: WorldSessionLister | null = null;

/** CombatWsHub registra fanout WS no boot. */
export function bindFriendPresenceBroadcast(deps: {
  readonly deliver: FriendPresenceDeliverer;
  readonly listWorldSessions: WorldSessionLister;
}): void {
  deliverer = deps.deliver;
  listWorldSessions = deps.listWorldSessions;
}

export function unbindFriendPresenceBroadcast(): void {
  deliverer = null;
  listWorldSessions = null;
}

/** Notifica quem tem `playerId:characterId` na lista de amigos. */
export function notifyFriendPresenceChange(
  playerId: string,
  characterId: number,
  online: boolean,
): void {
  if (!deliverer || !listWorldSessions) return;

  const update: FriendPresenceUpdate = {
    playerId: playerId.trim(),
    characterId: Math.floor(characterId),
    online,
  };
  if (!update.playerId || update.characterId < 1) return;

  for (const session of listWorldSessions()) {
    if (session.playerId === update.playerId && session.characterId === update.characterId) {
      continue;
    }
    if (!hasFriend(session.playerId, session.characterId, update.playerId, update.characterId)) {
      continue;
    }
    deliverer(session.connectionId, update);
  }
}
