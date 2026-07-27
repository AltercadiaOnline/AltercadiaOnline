import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getGameMode,
  resetGameModeCache,
  setGameMode,
} from './gameMode.js';
import { allowsOfflineGameplayFallback } from './onlineFirstPolicy.js';

describe('gameMode production lock', () => {
  afterEach(() => {
    resetGameModeCache();
    vi.unstubAllGlobals();
    try {
      window.localStorage.removeItem('altercadia.gameMode');
    } catch {
      /* ignore */
    }
  });

  it('forces online when host is not localhost even if storage says local', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'altercadia-online.vercel.app', search: '' },
      localStorage: {
        getItem: () => 'local',
        setItem: () => undefined,
        removeItem: () => undefined,
      },
      __ALTERCADIA_GAME_MODE__: undefined,
    });
    resetGameModeCache();
    expect(getGameMode()).toBe('online');
    expect(allowsOfflineGameplayFallback('altercadia-online.vercel.app')).toBe(false);
  });

  it('defaults to local on localhost without query', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', search: '' },
      localStorage: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
      __ALTERCADIA_GAME_MODE__: undefined,
    });
    resetGameModeCache();
    expect(getGameMode()).toBe('local');
    expect(allowsOfflineGameplayFallback('localhost')).toBe(true);
  });

  it('allows local on localhost via query', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', search: '?gameMode=local' },
      localStorage: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
      __ALTERCADIA_GAME_MODE__: undefined,
    });
    resetGameModeCache();
    expect(getGameMode()).toBe('local');
    expect(allowsOfflineGameplayFallback('localhost')).toBe(true);
  });

  it('setGameMode(local) is clamped on production host', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'altercadia-online.vercel.app', search: '' },
      localStorage: {
        store: {} as Record<string, string>,
        getItem(key: string) {
          return this.store[key] ?? null;
        },
        setItem(key: string, value: string) {
          this.store[key] = value;
        },
        removeItem(key: string) {
          delete this.store[key];
        },
      },
      __ALTERCADIA_GAME_MODE__: undefined,
    });
    resetGameModeCache();
    setGameMode('local');
    expect(getGameMode()).toBe('online');
  });
});
