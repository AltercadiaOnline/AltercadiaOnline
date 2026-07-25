export type PostBattleHubHandlerBundle = {
  readonly onStatistics: () => void;
  readonly onRewards?: () => void | Promise<void>;
  readonly onViewOpponent?: () => void;
  readonly onExit: () => void | Promise<void>;
};

type GlobalWithPostBattleHubHandlers = typeof globalThis & {
  __ALTERCADIA_POST_BATTLE_HUB_HANDLERS__?: PostBattleHubHandlerBundle | null;
};

function getHandlers(): PostBattleHubHandlerBundle | null {
  return (globalThis as GlobalWithPostBattleHubHandlers).__ALTERCADIA_POST_BATTLE_HUB_HANDLERS__ ?? null;
}

/**
 * Singleton cross-bundle (main.js + app-ui).
 * Sem globalThis, o React clica num registry vazio e Estatísticas/Recompensas/Sair
 * viram no-op (Sair fica preso em "Saindo…").
 */
export function registerPostBattleHubHandlers(bundle: PostBattleHubHandlerBundle): void {
  (globalThis as GlobalWithPostBattleHubHandlers).__ALTERCADIA_POST_BATTLE_HUB_HANDLERS__ = bundle;
}

export function clearPostBattleHubHandlers(): void {
  (globalThis as GlobalWithPostBattleHubHandlers).__ALTERCADIA_POST_BATTLE_HUB_HANDLERS__ = null;
}

export function triggerPostBattleStatistics(): void {
  getHandlers()?.onStatistics();
}

export function triggerPostBattleRewards(): Promise<void> {
  const action = getHandlers()?.onRewards;
  if (!action) return Promise.resolve();
  return Promise.resolve(action()).then(() => undefined);
}

export function triggerPostBattleViewOpponent(): void {
  getHandlers()?.onViewOpponent?.();
}

export function triggerPostBattleExit(): Promise<void> {
  const action = getHandlers()?.onExit;
  if (!action) return Promise.resolve();
  return Promise.resolve(action()).then(() => undefined);
}

export function hasPostBattleHubHandlers(): boolean {
  return getHandlers() !== null;
}
