/**
 * Superfície pública das mecânicas V1.2 (motor autoritativo único).
 */
export { CombatEngine } from './CombatEngine.js';
export { loadCombatBalanceConfig, getCombatBalanceVersion } from './combatBalanceConfig.js';

export type CombatMechanicsV12 = import('./CombatEngine.js').CombatEngine;
