import {
  TacticalSpray,
  SprayUsePayload,
  SprayInteractionRecord,
  SpraySocialFeedItem,
  OFFICIAL_SPRAY_STENCILS,
  PlaceSprayResult,
} from '../types/tacticalSpray.js';
import type { WorldSpraySnapshot } from './spraySocialTypes.js';
import {
  isSprayTooCloseToOthers,
  SPRAY_TOO_CLOSE_MESSAGE,
} from './sprayOverlap.js';
import { resolveMapTileSize } from '../world/activeMapTileSize.js';

export class TacticalSprayService {
  private activeSprays = new Map<string, TacticalSpray>();
  private sprayInteractions = new Map<string, SprayInteractionRecord[]>();

  public hydrateSprays(sprays: readonly TacticalSpray[]): void {
    this.activeSprays.clear();
    this.sprayInteractions.clear();
    for (const spray of sprays) {
      this.activeSprays.set(spray.id, spray);
      this.sprayInteractions.set(spray.id, []);
    }
  }

  public exportSprays(): TacticalSpray[] {
    return [...this.activeSprays.values()];
  }

  public placeSpray(payload: SprayUsePayload, authorNickname: string): PlaceSprayResult {
    if (!OFFICIAL_SPRAY_STENCILS[payload.sprayAssetId]) {
      return {
        ok: false,
        code: 'UNKNOWN_STENCIL',
        message: `Asset de spray não reconhecido no catálogo oficial: ${payload.sprayAssetId}`,
      };
    }

    const tileSize = resolveMapTileSize(payload.zoneId);
    const ownOnSameTile = [...this.activeSprays.values()].find(
      (spray) =>
        spray.zoneId === payload.zoneId
        && spray.posX === payload.posX
        && spray.posY === payload.posY
        && spray.userId === payload.userId
        && spray.authorCharacterId === payload.authorCharacterId,
    );

    const othersOnMap = [...this.activeSprays.values()]
      .filter((spray) => spray.zoneId === payload.zoneId)
      .filter((spray) => spray.id !== ownOnSameTile?.id)
      .map((spray) => ({ tileX: spray.posX, tileY: spray.posY }));

    if (
      isSprayTooCloseToOthers(
        { tileX: payload.posX, tileY: payload.posY },
        othersOnMap,
        { tileSize },
      )
    ) {
      return {
        ok: false,
        code: 'SPRAY_TOO_CLOSE',
        message: SPRAY_TOO_CLOSE_MESSAGE,
      };
    }

    if (ownOnSameTile) {
      this.activeSprays.delete(ownOnSameTile.id);
      this.sprayInteractions.delete(ownOnSameTile.id);
    }

    const sprayId = ownOnSameTile?.id
      ?? `spray_${payload.zoneId}_${payload.posX}_${payload.posY}_${Date.now()}`;
    const newSpray: TacticalSpray = {
      id: sprayId,
      zoneId: payload.zoneId,
      posX: payload.posX,
      posY: payload.posY,
      userId: payload.userId,
      authorCharacterId: payload.authorCharacterId,
      authorNickname,
      sprayAssetId: payload.sprayAssetId,
      createdAt: Date.now(),
      upvoteCount: ownOnSameTile?.upvoteCount ?? 0,
    };

    this.activeSprays.set(sprayId, newSpray);
    if (!this.sprayInteractions.has(sprayId)) {
      this.sprayInteractions.set(sprayId, []);
    }
    return { ok: true, spray: newSpray, replacedOwn: Boolean(ownOnSameTile) };
  }

  public getSprayById(sprayId: string): TacticalSpray | null {
    return this.activeSprays.get(sprayId) ?? null;
  }

  public getSpraysInZone(zoneId: string): TacticalSpray[] {
    const result: TacticalSpray[] = [];
    for (const spray of this.activeSprays.values()) {
      if (spray.zoneId === zoneId) {
        result.push(spray);
      }
    }
    return result;
  }

  public toZoneSnapshots(zoneId: string): WorldSpraySnapshot[] {
    return this.getSpraysInZone(zoneId).map((spray) => ({
      id: spray.id,
      mapId: spray.zoneId,
      tileX: spray.posX,
      tileY: spray.posY,
      sprayAssetId: spray.sprayAssetId,
      authorPlayerId: spray.userId,
      authorCharacterId: spray.authorCharacterId,
      upvoteCount: spray.upvoteCount,
    }));
  }

  public upvoteSpray(sprayId: string, interatorUserId: string, interatorNickname: string): {
    success: boolean;
    voltsRewarded: number;
    reputationRewarded: number;
  } {
    const spray = this.activeSprays.get(sprayId);
    if (!spray) {
      return { success: false, voltsRewarded: 0, reputationRewarded: 0 };
    }

    const interactions = this.sprayInteractions.get(sprayId) || [];
    const alreadyUpvoted = interactions.some(
      (i) => i.interatorUserId === interatorUserId && i.interactionType === 'UPVOTE',
    );
    if (alreadyUpvoted) {
      return { success: false, voltsRewarded: 0, reputationRewarded: 0 };
    }

    interactions.push({
      sprayId,
      interatorUserId,
      interatorNickname,
      interactionType: 'UPVOTE',
      timestamp: Date.now(),
    });
    this.sprayInteractions.set(sprayId, interactions);
    this.activeSprays.set(sprayId, {
      ...spray,
      upvoteCount: spray.upvoteCount + 1,
    });

    return { success: true, voltsRewarded: 15, reputationRewarded: 5 };
  }

  public getPlayerSocialFeed(userId: string): SpraySocialFeedItem[] {
    const feed: SpraySocialFeedItem[] = [];
    for (const spray of this.activeSprays.values()) {
      if (spray.userId !== userId) continue;
      const interactions = this.sprayInteractions.get(spray.id) || [];
      const upvoteCount = interactions.filter((i) => i.interactionType === 'UPVOTE').length;
      feed.push({
        sprayId: spray.id,
        zoneId: spray.zoneId,
        posX: spray.posX,
        posY: spray.posY,
        sprayAssetId: spray.sprayAssetId,
        totalUpvotes: upvoteCount,
        interactions,
        totalVoltsEarned: upvoteCount * 15,
        totalZoneReputationEarned: upvoteCount * 5,
      });
    }
    return feed;
  }

  public removeSpraysForAuthor(userId: string, characterId: number): number {
    let removed = 0;
    for (const spray of [...this.activeSprays.values()]) {
      if (spray.userId !== userId || spray.authorCharacterId !== characterId) continue;
      this.activeSprays.delete(spray.id);
      this.sprayInteractions.delete(spray.id);
      removed += 1;
    }
    return removed;
  }

  /** Wipe de todos os pixos do chão (corte semanal). */
  public resetAllWorldSprays(): number {
    const count = this.activeSprays.size;
    this.activeSprays.clear();
    this.sprayInteractions.clear();
    return count;
  }

  /** @deprecated Use resetAllWorldSprays — corte é segunda 07h, não domingo. */
  public resetAllSpraysSunday(): number {
    return this.resetAllWorldSprays();
  }
}

export const tacticalSprayService = new TacticalSprayService();
