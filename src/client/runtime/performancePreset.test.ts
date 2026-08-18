import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  detectLiteHardware,
  getPerformanceChoice,
  getPerformanceMode,
  installPerformancePreset,
  PERFORMANCE_PRESET_STORAGE_KEY,
  resetPerformancePresetForTests,
  resolvePerformanceMode,
  setPerformanceChoice,
  shouldSkipRenderFrame,
} from './performancePreset.js';

function stubBrowser(options: {
  search?: string;
  storage?: Record<string, string>;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}): Record<string, string> {
  const store = options.storage ?? {};
  vi.stubGlobal('window', {
    location: { search: options.search ?? '' },
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
  });
  vi.stubGlobal('navigator', {
    deviceMemory: options.deviceMemory,
    hardwareConcurrency: options.hardwareConcurrency ?? 8,
    userAgent: 'Mozilla/5.0',
  });
  vi.stubGlobal('document', {
    documentElement: {
      dataset: {} as Record<string, string>,
      classList: {
        toggle: vi.fn(),
        remove: vi.fn(),
      },
    },
    createElement: () => ({
      getContext: () => null,
    }),
  });
  resetPerformancePresetForTests();
  return store;
}

describe('performancePreset', () => {
  afterEach(() => {
    resetPerformancePresetForTests();
    vi.unstubAllGlobals();
  });

  it('detects software GL and tiny machines as lite', () => {
    expect(detectLiteHardware({ renderer: 'Google SwiftShader' })).toBe(true);
    expect(detectLiteHardware({ renderer: 'Microsoft Basic Render Driver' })).toBe(true);
    expect(detectLiteHardware({ deviceMemory: 4 })).toBe(true);
    expect(detectLiteHardware({ hardwareConcurrency: 2 })).toBe(true);
    expect(detectLiteHardware({ deviceMemory: 8, hardwareConcurrency: 8, renderer: 'ANGLE (NVIDIA)' })).toBe(
      false,
    );
  });

  it('locks lite/full and leaves auto to hardware', () => {
    expect(resolvePerformanceMode('lite', { deviceMemory: 32 })).toBe('lite');
    expect(resolvePerformanceMode('full', { renderer: 'SwiftShader' })).toBe('full');
    expect(resolvePerformanceMode('auto', { renderer: 'SwiftShader' })).toBe('lite');
    expect(resolvePerformanceMode('auto', { deviceMemory: 16, hardwareConcurrency: 8 })).toBe('full');
  });

  it('honors stored lite before first paint boot', () => {
    stubBrowser({
      storage: { [PERFORMANCE_PRESET_STORAGE_KEY]: 'lite' },
      deviceMemory: 16,
      hardwareConcurrency: 8,
    });
    installPerformancePreset();
    expect(getPerformanceChoice()).toBe('lite');
    expect(getPerformanceMode()).toBe('lite');
  });

  it('query ?perf=lite wins over storage for this page', () => {
    stubBrowser({
      search: '?perf=lite',
      storage: { [PERFORMANCE_PRESET_STORAGE_KEY]: 'full' },
      deviceMemory: 16,
    });
    installPerformancePreset();
    expect(getPerformanceChoice()).toBe('lite');
    expect(getPerformanceMode()).toBe('lite');
  });

  it('player click persists Normal and leaves lite hardware on full', () => {
    const store = stubBrowser({
      deviceMemory: 4,
      hardwareConcurrency: 2,
    });
    installPerformancePreset();
    expect(getPerformanceMode()).toBe('lite');
    setPerformanceChoice('full');
    expect(getPerformanceChoice()).toBe('full');
    expect(getPerformanceMode()).toBe('full');
    expect(store[PERFORMANCE_PRESET_STORAGE_KEY]).toBe('full');
  });

  it('skips frames under the lite interval', () => {
    expect(shouldSkipRenderFrame(0, 16, 33)).toBe(false);
    expect(shouldSkipRenderFrame(1000, 1016, 33)).toBe(true);
    expect(shouldSkipRenderFrame(1000, 1033, 33)).toBe(false);
    expect(shouldSkipRenderFrame(1000, 1016, 0)).toBe(false);
  });
});
