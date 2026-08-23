import path from 'node:path';

/** Pasta do save da conta — chave `(userId, characterId)`, independente do mundo. */
export const ACCOUNT_SAVE_DIR_NAME = 'account';

export type PersistenceLayout = {
  readonly baseDataDir: string;
  readonly characterDataDir: string;
  readonly worldDataDir: string;
  /** Pais de `characters/` no layout antigo (`data/azul`, `data`). */
  readonly legacyCharacterDataDirs: readonly string[];
};

/**
 * Conta em `{base}/account`. Mundo (spray, static) em `{base}/{serverId}`.
 * `SERVER_ID` = processo, não dono do personagem.
 */
export function resolvePersistenceLayout(
  baseDataDir: string,
  instanceId: string | null,
): PersistenceLayout {
  const characterDataDir = path.join(baseDataDir, ACCOUNT_SAVE_DIR_NAME);
  const worldDataDir = instanceId ? path.join(baseDataDir, instanceId) : baseDataDir;
  const legacy: string[] = [];
  if (worldDataDir !== characterDataDir) legacy.push(worldDataDir);
  if (baseDataDir !== characterDataDir && baseDataDir !== worldDataDir) {
    legacy.push(baseDataDir);
  }
  return {
    baseDataDir,
    characterDataDir,
    worldDataDir,
    legacyCharacterDataDirs: legacy,
  };
}
