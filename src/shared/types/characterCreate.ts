import type { ClassType } from './classes.js';

export type CharacterCreatePayload = {
  readonly slotIndex: number;
  readonly name: string;
  readonly class: ClassType;
};
