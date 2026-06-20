/** URLs públicas de um shard — expostas em GET /api/servers (sem segredos). */
export type ShardPublicEndpoints = {
  readonly gameHttpUrl: string | null;
  readonly gameWsUrl: string | null;
};

export const EMPTY_SHARD_ENDPOINTS: ShardPublicEndpoints = {
  gameHttpUrl: null,
  gameWsUrl: null,
};
