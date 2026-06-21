export type PostBattleHubHandlerBundle = {
  readonly onStatistics: () => void;
  readonly onRewards?: () => void | Promise<void>;
  readonly onViewOpponent?: () => void;
  readonly onExit: () => void | Promise<void>;
};

let handlers: PostBattleHubHandlerBundle | null = null;

export function registerPostBattleHubHandlers(bundle: PostBattleHubHandlerBundle): void {
  handlers = bundle;
}

export function clearPostBattleHubHandlers(): void {
  handlers = null;
}

export function triggerPostBattleStatistics(): void {
  handlers?.onStatistics();
}

export function triggerPostBattleRewards(): void {
  const action = handlers?.onRewards;
  if (!action) return;
  void Promise.resolve(action());
}

export function triggerPostBattleViewOpponent(): void {
  handlers?.onViewOpponent?.();
}

export function triggerPostBattleExit(): void {
  const action = handlers?.onExit;
  if (!action) return;
  void Promise.resolve(action());
}

export function hasPostBattleHubHandlers(): boolean {
  return handlers !== null;
}
