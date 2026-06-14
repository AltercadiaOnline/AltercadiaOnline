export type HealAtNpcIntentRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly npcId: string;
  readonly intentId: string;
};

export type HealAtNpcIntentResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };
