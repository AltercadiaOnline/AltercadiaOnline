import type {
  SubZoneTransitionId,
  TerminalInitResponse,
  TerminalSubmitResponse,
  ZoneDomainSnapshot,
} from '../../shared/types/zoneBypass.js';
import { ZoneBypassService } from '../../shared/world/zoneBypassStore.js';
import { zoneBypassPlayerKey } from '../../shared/world/zoneBypassPlayerKey.js';
import {
  bumpZoneBypassHoldersRevision,
  bumpZoneBypassPlayerRevision,
} from './zoneBypassSyncDirty.js';
import {
  loadZoneBypassHolderPersistence,
  persistZoneBypassHolders,
} from '../persistence/zoneBypassHolderPersistence.js';
import { markCharacterPersistenceDirty } from '../persistence/characterPersistenceDirty.js';

let gateway: AuthoritativeZoneBypassGateway | null = null;

export class AuthoritativeZoneBypassGateway {
  private readonly service = new ZoneBypassService();
  private bootstrapped = false;

  async ensureBootstrapped(): Promise<void> {
    if (this.bootstrapped) return;
    const holders = await loadZoneBypassHolderPersistence();
    this.service.hydrateZoneHolders(holders);
    bumpZoneBypassHoldersRevision();
    this.bootstrapped = true;
  }

  hydrateCharacterUnlocks(playerId: string, characterId: number, unlockedZones: readonly string[]): void {
    const key = zoneBypassPlayerKey(playerId, characterId);
    this.service.hydratePlayerUnlocks(key, unlockedZones);
    if (unlockedZones.length > 0) {
      bumpZoneBypassPlayerRevision(key);
    }
  }

  initSession(
    playerId: string,
    characterId: number,
    transitionId: SubZoneTransitionId,
  ): TerminalInitResponse {
    const key = zoneBypassPlayerKey(playerId, characterId);
    return this.service.initTerminalSession(key, transitionId);
  }

  submitAnswer(
    playerId: string,
    characterId: number,
    sessionId: string,
    inputCode: string,
    holderDisplayName: string,
  ): TerminalSubmitResponse {
    const key = zoneBypassPlayerKey(playerId, characterId);
    const result = this.service.submitTerminalAnswer(
      sessionId,
      key,
      inputCode,
      1000,
      holderDisplayName,
    );

    if (result.success) {
      void this.persistPlayerUnlocks(playerId, characterId);
      void this.persistHoldersIfChanged();
      bumpZoneBypassPlayerRevision(key);
    } else if (result.lockdownDurationMs) {
      bumpZoneBypassPlayerRevision(key);
    }

    return result;
  }

  getDomainSnapshot(
    playerId: string,
    characterId: number,
    boundTransitionId?: SubZoneTransitionId,
  ): ZoneDomainSnapshot {
    const key = zoneBypassPlayerKey(playerId, characterId);
    return this.service.getDomainSnapshot(key, Date.now(), boundTransitionId);
  }

  exportPlayerUnlocks(playerId: string, characterId: number): readonly string[] {
    return this.service.exportPlayerUnlocks(zoneBypassPlayerKey(playerId, characterId));
  }

  private async persistPlayerUnlocks(playerId: string, characterId: number): Promise<void> {
    markCharacterPersistenceDirty(playerId, characterId, 'progression');
  }

  private async persistHoldersIfChanged(): Promise<void> {
    const holders = this.service.exportZoneHolders();
    bumpZoneBypassHoldersRevision();
    await persistZoneBypassHolders(holders);
  }
}

export function getAuthoritativeZoneBypassGateway(): AuthoritativeZoneBypassGateway {
  if (!gateway) gateway = new AuthoritativeZoneBypassGateway();
  return gateway;
}

export function resetAuthoritativeZoneBypassGatewayForTests(): void {
  gateway = null;
}
