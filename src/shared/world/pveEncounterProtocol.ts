/**
 * Oferta de encontro PVE (mundo) — servidor envia; cliente só espelha HUD.
 */

export type PveEncounterOfferPayload = {
  readonly monsterInstanceId: string;
  readonly creatureId: string;
  readonly name: string;
  readonly mapId: string;
  /** Epoch ms — UI pode ignorar; servidor invalida se expirar. */
  readonly offeredAtMs: number;
};

export type PveEncounterClearPayload = {
  readonly monsterInstanceId: string;
  readonly reason: 'accepted' | 'fled' | 'failed_flee' | 'expired' | 'cancelled' | 'moved_away';
};

export type PveEncounterFleeResultPayload = {
  readonly monsterInstanceId: string;
  readonly success: boolean;
  readonly message: string;
};
