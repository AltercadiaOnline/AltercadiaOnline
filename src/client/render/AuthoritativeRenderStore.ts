/**
 * @deprecated Posição visual do jogador: PlayerDataStore (GSS) → Player → GameRenderer.
 * Mantido apenas para reset de sessão — sem estado de posição duplicado.
 */
export function resetAuthoritativeRenderStore(): void {
  // no-op — SSOT de posição em PlayerDataStore
}
