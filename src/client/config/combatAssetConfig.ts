/**
 * Placeholder (div esfera) vs asset real (PNG em public/assets/combat/projectiles/).
 *
 * - Constante `USE_COMBAT_ASSETS` — default do projeto.
 * - Runtime: `window.ALTERCADIA_USE_COMBAT_ASSETS = true` no console do browser.
 * - Deploy: injete a flag via script no index.html a partir de COMBAT_USE_ASSETS no .env do servidor.
 */
export const USE_COMBAT_ASSETS = false;

type CombatAssetGlobal = typeof globalThis & {
  ALTERCADIA_USE_COMBAT_ASSETS?: boolean;
};

export function resolveUseCombatAssets(): boolean {
  const runtime = (globalThis as CombatAssetGlobal).ALTERCADIA_USE_COMBAT_ASSETS;
  if (typeof runtime === 'boolean') return runtime;
  return USE_COMBAT_ASSETS;
}

export function setUseCombatAssets(enabled: boolean): void {
  (globalThis as CombatAssetGlobal).ALTERCADIA_USE_COMBAT_ASSETS = enabled;
}
