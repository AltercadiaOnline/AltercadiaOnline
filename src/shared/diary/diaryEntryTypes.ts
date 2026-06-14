import type { MapId } from '../world/mapRegistry.js';
import type { PetKindId } from '../pet/petCatalog.js';

export const DiaryEntryType = {
  PET_DEATH: 'PET_DEATH',
  BOSS_DEFEAT: 'BOSS_DEFEAT',
  MILESTONE: 'MILESTONE',
} as const;

export type DiaryEntryType = (typeof DiaryEntryType)[keyof typeof DiaryEntryType];

export type PetDeathDiaryMetadata = {
  readonly petName: string;
  readonly kindId: PetKindId;
  readonly ageYearsAtDeath: number;
  readonly memorialId: string;
  readonly bondTierLabel: string;
  readonly farewellQuote: string;
};

export type BossDefeatDiaryMetadata = {
  readonly creatureId: string;
  readonly monsterName: string;
  readonly xpGained: number;
  readonly mapId: MapId;
  readonly tileX: number;
  readonly tileY: number;
};

export type MilestoneDiaryMetadata = {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly branchLabel: string;
  readonly shortBonus?: string;
};

export type DiaryEntry =
  | {
      readonly entryId: string;
      readonly type: typeof DiaryEntryType.PET_DEATH;
      readonly title: string;
      readonly timestamp: number;
      readonly content: string;
      readonly metadata: PetDeathDiaryMetadata;
    }
  | {
      readonly entryId: string;
      readonly type: typeof DiaryEntryType.BOSS_DEFEAT;
      readonly title: string;
      readonly timestamp: number;
      readonly content: string;
      readonly metadata: BossDefeatDiaryMetadata;
    }
  | {
      readonly entryId: string;
      readonly type: typeof DiaryEntryType.MILESTONE;
      readonly title: string;
      readonly timestamp: number;
      readonly content: string;
      readonly metadata: MilestoneDiaryMetadata;
    };

export type PlayerDiarySnapshot = {
  readonly entries: readonly DiaryEntry[];
};
