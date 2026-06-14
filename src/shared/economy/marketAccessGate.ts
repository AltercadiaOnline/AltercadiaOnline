/** Mercado só abre após interação física com o Terminal de Trocas. */
let terminalAccessGranted = false;

export function grantMarketTerminalAccess(): void {
  terminalAccessGranted = true;
}

export function revokeMarketTerminalAccess(): void {
  terminalAccessGranted = false;
}

export function isMarketTerminalAccessGranted(): boolean {
  return terminalAccessGranted;
}
