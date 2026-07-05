/**
 * Guardas de execução do combate — diagnóstico sem congelar o browser.
 *
 * Nota de migração: não existe `attackState` legado. O playback visual usa:
 * - CombatFeedbackExecutionQueue (fila serial)
 * - combatPlaybackState (flags de fim / ação ativa)
 * - PlayerDataStore → Player (posição visual; não arena DOM)
 *
 * A arena de combate é DOM (#scene-combat); exploração usa Phaser + overlays DOM.
 * para quando GameState !== EXPLORATION (main.ts shouldRun).
 */

export type CombatSafeContext =
  | 'feedback-pipeline'
  | 'feedback-queue'
  | 'battle-controller'
  | 'combat-dispatch'
  | 'vfx-projectile';

export function logCriticalBattleError(context: CombatSafeContext, error: unknown): void {
  const detail = error instanceof Error
    ? { message: error.message, stack: error.stack, name: error.name }
    : { value: String(error) };
  console.error(`CRITICAL BATTLE RENDER ERROR [${context}]:`, detail);
}

export async function runCombatSafe<T>(
  context: CombatSafeContext,
  action: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    logCriticalBattleError(context, error);
    return fallback;
  }
}

export async function runCombatSafeVoid(
  context: CombatSafeContext,
  action: () => Promise<void>,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    logCriticalBattleError(context, error);
  }
}

/** Evita fila de feedback presa para sempre (ex.: tween GSAP sem onComplete). */
export const COMBAT_PLAYBACK_HARD_TIMEOUT_MS = 15_000;

export function raceCombatPlayback<T>(
  promise: Promise<T>,
  timeoutMs = COMBAT_PLAYBACK_HARD_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Combat playback timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
