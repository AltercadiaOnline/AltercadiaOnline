/** Gate lógico — reset de trilha Marcos só permitido junto ao NPC de reset. */
let playerAtNPCReset = false;

export function setPlayerAtMarcosResetNpc(atNpc: boolean): void {
  playerAtNPCReset = atNpc;
}

export function isMarcosTrailResetAllowed(): boolean {
  return playerAtNPCReset;
}
