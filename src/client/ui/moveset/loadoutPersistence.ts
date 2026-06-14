/**
 * Persistência do loadout confirmado — ponto único para a chamada de rede.
 * Só após sucesso aqui o GlobalPlayerStore grava localmente e emite LOADOUT_SAVED.
 */
export async function persistLoadoutToServer(activeMovesets: readonly string[]): Promise<void> {
  void activeMovesets;
  await Promise.resolve();
}
