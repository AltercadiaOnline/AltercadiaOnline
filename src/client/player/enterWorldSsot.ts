/**
 * SSOT do espelho no enter-world
 *
 * | Modo    | Quem escreve inventário/wallet/pets/level/XP/class |
 * |---------|-----------------------------------------------------|
 * | online  | `GlobalStateSynchronizer.applyFullState` (HTTP e/ou WS) |
 * | local   | `MockEconomyService.bindLocalCharacter` / save        |
 *
 * Posição no mundo (online): só `world-login-result`.
 * Hub (`AccountCharacter`): só nome/skin de apresentação — NUNCA level/XP/economia.
 * `initializePlayerState` / purge: só logout / reset — nunca no meio do enter-world.
 */
import { isLocalGameMode } from '../runtime/gameMode.js';

/** Local não passa por `/api/player-snapshot` — evita dual-write com o save. */
export function shouldFetchHttpSnapshotBeforeEnterWorld(): boolean {
  return !isLocalGameMode();
}
