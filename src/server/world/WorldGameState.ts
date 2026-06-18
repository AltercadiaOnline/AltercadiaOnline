import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { PlayerProfile } from '../models/playerProfile.js';

export type ActivePlayerStatus = 'exploring' | 'battle' | 'idle';

export type ActivePlayerState = {
  readonly connectionId: string;
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  mapId: string;
  x: number;
  y: number;
  facing: PlayerFacing;
  status: ActivePlayerStatus;
  lastTick: number;
  /** Posição mudou desde o último broadcast de peers. */
  peerDirty: boolean;
};

function playerKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

/**
 * SSOT em memória — posições e status dos jogadores online.
 * Nunca consulta banco por movimento.
 */
export class WorldGameState {
  private readonly byConnection = new Map<string, ActivePlayerState>();
  private readonly connectionByPlayerKey = new Map<string, string>();

  registerPlayer(input: {
    readonly connectionId: string;
    readonly playerId: string;
    readonly characterId: number;
    readonly displayName: string;
    readonly profile: PlayerProfile;
    readonly status?: ActivePlayerStatus;
  }): ActivePlayerState {
    const state: ActivePlayerState = {
      connectionId: input.connectionId,
      playerId: input.playerId,
      characterId: input.characterId,
      displayName: input.displayName,
      mapId: input.profile.currentMapId,
      x: input.profile.lastPosition.x,
      y: input.profile.lastPosition.y,
      facing: input.profile.facing,
      status: input.status ?? 'exploring',
      lastTick: 0,
      peerDirty: true,
    };

    this.byConnection.set(input.connectionId, state);
    this.connectionByPlayerKey.set(playerKey(input.playerId, input.characterId), input.connectionId);
    return state;
  }

  unregisterConnection(connectionId: string): ActivePlayerState | null {
    const existing = this.byConnection.get(connectionId);
    if (!existing) return null;

    this.byConnection.delete(connectionId);
    this.connectionByPlayerKey.delete(playerKey(existing.playerId, existing.characterId));
    return existing;
  }

  getByConnection(connectionId: string): ActivePlayerState | null {
    return this.byConnection.get(connectionId) ?? null;
  }

  getByPlayer(playerId: string, characterId: number): ActivePlayerState | null {
    const connectionId = this.connectionByPlayerKey.get(playerKey(playerId, characterId));
    if (!connectionId) return null;
    return this.byConnection.get(connectionId) ?? null;
  }

  syncFromProfile(
    connectionId: string,
    profile: PlayerProfile,
    status: ActivePlayerStatus,
    tick: number,
  ): ActivePlayerState | null {
    const state = this.byConnection.get(connectionId);
    if (!state) return null;

    const moved =
      state.mapId !== profile.currentMapId
      || state.x !== profile.lastPosition.x
      || state.y !== profile.lastPosition.y
      || state.facing !== profile.facing;

    state.mapId = profile.currentMapId;
    state.x = profile.lastPosition.x;
    state.y = profile.lastPosition.y;
    state.facing = profile.facing;
    state.status = status;
    state.lastTick = tick;
    if (moved) {
      state.peerDirty = true;
    }

    return state;
  }

  setStatus(connectionId: string, status: ActivePlayerStatus): void {
    const state = this.byConnection.get(connectionId);
    if (!state) return;
    state.status = status;
  }

  listExploringOnMap(mapId: string): ActivePlayerState[] {
    const result: ActivePlayerState[] = [];
    for (const state of this.byConnection.values()) {
      if (state.mapId === mapId && state.status === 'exploring') {
        result.push(state);
      }
    }
    return result;
  }

  listAllActive(): readonly ActivePlayerState[] {
    return [...this.byConnection.values()];
  }

  listPersistablePlayers(): readonly { readonly playerId: string; readonly characterId: number }[] {
    const seen = new Set<string>();
    const rows: { readonly playerId: string; readonly characterId: number }[] = [];
    for (const state of this.byConnection.values()) {
      const key = playerKey(state.playerId, state.characterId);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ playerId: state.playerId, characterId: state.characterId });
    }
    return rows;
  }

  clearPeerDirty(connectionId: string): void {
    const state = this.byConnection.get(connectionId);
    if (state) state.peerDirty = false;
  }

  hasDirtyPeersOnMap(mapId: string): boolean {
    for (const state of this.byConnection.values()) {
      if (state.mapId === mapId && state.peerDirty && state.status === 'exploring') {
        return true;
      }
    }
    return false;
  }

  reset(): void {
    this.byConnection.clear();
    this.connectionByPlayerKey.clear();
  }
}

let activeState: WorldGameState | null = null;

export function getWorldGameState(): WorldGameState {
  activeState ??= new WorldGameState();
  return activeState;
}

export function resetWorldGameState(): void {
  activeState?.reset();
  activeState = null;
}
