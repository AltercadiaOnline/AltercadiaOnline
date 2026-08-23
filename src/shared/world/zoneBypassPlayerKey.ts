/** Chave estável de progresso de bypass — um registro por personagem (viaja com o char). */
export function zoneBypassPlayerKey(playerId: string, characterId: number): string {
  return `${playerId.trim()}:${Math.floor(characterId)}`;
}
