/** Bloqueia input de exploração até o handshake world-login-result do servidor. */
let worldSessionReady = false;

export function isWorldSessionReady(): boolean {
  return worldSessionReady;
}

export function setWorldSessionReady(ready: boolean): void {
  worldSessionReady = ready;
}

export function resetWorldSessionGate(): void {
  worldSessionReady = false;
}
