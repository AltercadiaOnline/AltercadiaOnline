// @ts-nocheck
/** Flag leve — evita importar PhaserRuntime em módulos de UI/combate. */
let phaserRuntimeActive = false;
export function isPhaserRuntimeActive() {
    return phaserRuntimeActive;
}
export function setPhaserRuntimeActive(active) {
    phaserRuntimeActive = active;
}
