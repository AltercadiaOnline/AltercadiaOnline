import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyServerDefaultGameMode,
  getGameMode,
  resetGameModeCache,
  setGameMode,
} from './gameMode.js';
import { allowsOfflineGameplayFallback } from './onlineFirstPolicy.js';

function stubWindow(options: {
  hostname: string;
  search?: string;
  storage?: Record<string, string>;
}): Record<string, string> {
  const store = options.storage ?? {};
  vi.stubGlobal('window', {
    location: { hostname: options.hostname, search: options.search ?? '' },
    localStorage: {
      getItem(key: string) {
        return store[key] ?? null;
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
      removeItem(key: string) {
        delete store[key];
      },
    },
    __ALTERCADIA_GAME_MODE__: undefined,
  });
  resetGameModeCache();
  return store;
}

describe('gameMode online-first', () => {
  afterEach(() => {
    resetGameModeCache();
    vi.unstubAllGlobals();
    try {
      window.localStorage.removeItem('altercadia.gameMode');
    } catch {
      /* ignore */
    }
  });

  it('forces online when host is not localhost even if query says local', () => {
    stubWindow({
      hostname: 'altercadia-online.vercel.app',
      search: '?gameMode=local',
      storage: { 'altercadia.gameMode': 'local' },
    });
    expect(getGameMode()).toBe('online');
    expect(allowsOfflineGameplayFallback('altercadia-online.vercel.app')).toBe(false);
  });

  it('defaults to online on localhost without query', () => {
    const store = stubWindow({
      hostname: 'localhost',
      storage: { 'altercadia.gameMode': 'local' },
    });
    expect(getGameMode()).toBe('online');
    expect(store['altercadia.gameMode']).toBeUndefined();
    expect(allowsOfflineGameplayFallback('localhost')).toBe(false);
  });

  it('allows mock on localhost via query', () => {
    stubWindow({
      hostname: 'localhost',
      search: '?gameMode=local',
    });
    expect(getGameMode()).toBe('local');
    expect(allowsOfflineGameplayFallback('localhost')).toBe(true);
  });

  it('query online on localhost stays online without sticky storage', () => {
    const store = stubWindow({
      hostname: 'localhost',
      search: '?gameMode=online',
    });
    expect(getGameMode()).toBe('online');
    expect(store['altercadia.gameMode']).toBeUndefined();
  });

  it('server default mock applies only when there is no query', () => {
    stubWindow({ hostname: 'localhost' });
    expect(getGameMode()).toBe('online');
    applyServerDefaultGameMode('local');
    expect(getGameMode()).toBe('local');
    expect(allowsOfflineGameplayFallback('localhost')).toBe(true);
  });

  it('query wins over server default mock', () => {
    stubWindow({
      hostname: 'localhost',
      search: '?gameMode=online',
    });
    applyServerDefaultGameMode('local');
    expect(getGameMode()).toBe('online');
  });

  it('setGameMode(local) is clamped on production host', () => {
    stubWindow({ hostname: 'altercadia-online.vercel.app' });
    setGameMode('local');
    expect(getGameMode()).toBe('online');
  });
});
