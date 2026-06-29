import type { ClassType } from './classes.js';
import type { PlayerSkinBundleId } from '../character/playerSkinBundle.js';

export type CharacterCreatePayload = {
  readonly slotIndex: number;
  readonly name: string;
  readonly class: ClassType;
  readonly skinBundleId: PlayerSkinBundleId;
};
