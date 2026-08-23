import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACCOUNT_SAVE_DIR_NAME, resolvePersistenceLayout } from './persistenceLayout.js';

describe('resolvePersistenceLayout', () => {
  it('separa conta de mundo quando há SERVER_ID', () => {
    const layout = resolvePersistenceLayout('/data', 'azul');
    expect(layout.characterDataDir).toBe(path.join('/data', ACCOUNT_SAVE_DIR_NAME));
    expect(layout.worldDataDir).toBe(path.join('/data', 'azul'));
    expect(layout.legacyCharacterDataDirs).toContain(path.join('/data', 'azul'));
  });

  it('sem instância ainda promove o data/ antigo para account/', () => {
    const layout = resolvePersistenceLayout('/data', null);
    expect(layout.characterDataDir).toBe(path.join('/data', ACCOUNT_SAVE_DIR_NAME));
    expect(layout.worldDataDir).toBe('/data');
    expect(layout.legacyCharacterDataDirs).toEqual(['/data']);
  });
});
