/**
 * Factory central — serviços pesados só via `import()` dinâmico.
 * Evita acoplamento por importação estática na tela de Login/Char Select.
 */
import { isGameDomainActive } from './executionDomain.js';

export type CreatureAssetLoaderModule = typeof import('../loaders/CreatureAssetLoader.js');
export type BattleSpriteCatalogModule = typeof import('../ui/battle/battleSpriteCatalog.js');
export type CombatClientModule = typeof import('../combat/index.js');
export type MapLoaderModule = typeof import('../phaser/tiled/MapLoader.js');
export type PhaserRuntimeModule = typeof import('../phaser/PhaserRuntime.js');
export type GameSessionModule = typeof import('../browser/gameSession.js');

const moduleCache = new Map<string, Promise<unknown>>();

function loadOnce<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = moduleCache.get(key) as Promise<T> | undefined;
  if (cached) return cached;
  const pending = loader();
  moduleCache.set(key, pending);
  return pending;
}

function assertGameDomain(serviceName: string): void {
  if (!isGameDomainActive()) {
    throw new Error(
      `[ServiceRegistry] "${serviceName}" bloqueado — domínio login ativo (aguarde Entrar no Mundo).`,
    );
  }
}

export function loadCreatureAssetLoader(): Promise<CreatureAssetLoaderModule> {
  assertGameDomain('CreatureAssetLoader');
  return loadOnce('creatureAssetLoader', () => import('../loaders/CreatureAssetLoader.js'));
}

export function loadBattleSpriteCatalog(): Promise<BattleSpriteCatalogModule> {
  assertGameDomain('battleSpriteCatalog');
  return loadOnce('battleSpriteCatalog', () => import('../ui/battle/battleSpriteCatalog.js'));
}

export function loadCombatClient(): Promise<CombatClientModule> {
  assertGameDomain('combat');
  return loadOnce('combat', () => import('../combat/index.js'));
}

export function loadMapLoader(): Promise<MapLoaderModule> {
  assertGameDomain('MapLoader');
  return loadOnce('mapLoader', () => import('../phaser/tiled/MapLoader.js'));
}

export function loadPhaserRuntime(): Promise<PhaserRuntimeModule> {
  assertGameDomain('PhaserRuntime');
  return loadOnce('phaserRuntime', () => import('../phaser/PhaserRuntime.js'));
}

export function loadGameSession(): Promise<GameSessionModule> {
  return loadOnce('gameSession', () => import('../browser/gameSession.js'));
}

/** Limpa cache de módulos (logout / teardown total). */
export function resetServiceRegistry(): void {
  moduleCache.clear();
}
