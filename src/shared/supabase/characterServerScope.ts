/** Mensagem padrão quando uma operação de personagem omite server_id. */
export const ARCHITECTURE_SERVER_ID_REQUIRED = 'Erro de Arquitetura: server_id obrigatório';

/** Escopo obrigatório para qualquer leitura/escrita de personagem em shard isolado. */
export type CharacterServerScope = {
  readonly userId: string;
  readonly serverId: string;
};

export type CharacterServerKey = CharacterServerScope & {
  readonly characterId: number;
};

export function requireServerId(serverId: string | undefined | null): string {
  const normalized = serverId?.trim().toLowerCase();
  if (!normalized) {
    throw new Error(ARCHITECTURE_SERVER_ID_REQUIRED);
  }
  return normalized;
}

/** Bloqueia queries legadas sem filtro de shard. */
export function rejectUnscopedCharacterQuery(): never {
  throw new Error(ARCHITECTURE_SERVER_ID_REQUIRED);
}

export function createCharacterServerKey(
  userId: string,
  serverId: string,
  characterId: number,
): CharacterServerKey {
  return {
    userId,
    serverId: requireServerId(serverId),
    characterId,
  };
}

export function assertCharacterServerKey(
  scope: Partial<CharacterServerKey> | null | undefined,
): asserts scope is CharacterServerKey {
  if (!scope?.userId?.trim()) {
    throw new Error(ARCHITECTURE_SERVER_ID_REQUIRED);
  }
  requireServerId(scope.serverId);
  if (typeof scope.characterId !== 'number' || !Number.isFinite(scope.characterId) || scope.characterId < 1) {
    throw new Error('Erro de Arquitetura: characterId inválido.');
  }
}
