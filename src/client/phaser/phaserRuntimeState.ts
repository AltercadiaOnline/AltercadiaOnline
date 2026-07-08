/** Flag leve — evita importar PhaserRuntime em módulos de UI/combate. */
let phaserRuntimeActive = false;

export function isPhaserRuntimeActive(): boolean {
  return phaserRuntimeActive;
}

export function setPhaserRuntimeActive(active: boolean): void {
  phaserRuntimeActive = active;
}
