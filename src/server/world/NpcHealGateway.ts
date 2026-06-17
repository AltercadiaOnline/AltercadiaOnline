import type { PlayerWorldVitals } from '../../shared/character/equipmentState.js';

export type HealAtNpcIntentRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly npcId: string;
  readonly intentId: string;
  readonly clientVitals?: PlayerWorldVitals;
  readonly clientMapId?: string;
  readonly clientPosition?: { readonly x: number; readonly y: number };
};

export type HealAtNpcIntentResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };
