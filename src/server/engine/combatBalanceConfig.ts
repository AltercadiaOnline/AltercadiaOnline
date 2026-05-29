import balanceV12 from './combat_balance_v1_2.json' with { type: 'json' };

export type CombatBalanceV12 = typeof balanceV12;

let cached: CombatBalanceV12 | null = null;

/** Carrega contrato versionado V1.2 (singleton em runtime). */
export function loadCombatBalanceConfig(): CombatBalanceV12 {
  if (!cached) {
    cached = balanceV12;
    if (cached.version !== '1.2.0') {
      throw new Error(`Unsupported combat balance version: ${cached.version}`);
    }
  }
  return cached;
}

export function getCombatBalanceVersion(): string {
  return loadCombatBalanceConfig().version;
}
