import {
  TacticalSpray,
  SprayUsePayload,
  SprayInteractionRecord,
  SpraySocialFeedItem,
  OFFICIAL_SPRAY_STENCILS,
} from '../types/tacticalSpray.js';

export class TacticalSprayService {
  private activeSprays = new Map<string, TacticalSpray>();
  private sprayInteractions = new Map<string, SprayInteractionRecord[]>();

  public placeSpray(payload: SprayUsePayload, authorNickname: string): TacticalSpray {
    if (!OFFICIAL_SPRAY_STENCILS[payload.sprayAssetId]) {
      throw new Error(`Asset de spray não reconhecido no catálogo oficial: ${payload.sprayAssetId}`);
    }

    for (const [existingId, spray] of this.activeSprays.entries()) {
      if (
        spray.zoneId === payload.zoneId
        && spray.posX === payload.posX
        && spray.posY === payload.posY
        && spray.userId === payload.userId
      ) {
        this.activeSprays.delete(existingId);
        this.sprayInteractions.delete(existingId);
        break;
      }
    }

    const sprayId = `spray_${payload.zoneId}_${payload.posX}_${payload.posY}_${Date.now()}`;
    const newSpray: TacticalSpray = {
      id: sprayId,
      zoneId: payload.zoneId,
      posX: payload.posX,
      posY: payload.posY,
      userId: payload.userId,
      authorNickname,
      sprayAssetId: payload.sprayAssetId,
      createdAt: Date.now(),
      upvoteCount: 0,
    };

    this.activeSprays.set(sprayId, newSpray);
    this.sprayInteractions.set(sprayId, []);
    return newSpray;
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

  public resetAllSpraysSunday(): number {
    const count = this.activeSprays.size;
    this.activeSprays.clear();
    this.sprayInteractions.clear();
    return count;
  }
}

export const tacticalSprayService = new TacticalSprayService();
