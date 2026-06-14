/** Barrel de compatibilidade — motor autoritativo: CombatEngine + calculateDamage. */
export {
  calculateDamage,
  isPhysicalMove,
  MIN_BATTLE_DAMAGE,
  normalizeBattleMove,
  resolveCombatantAttack,
  resolveCombatantDefense,
  resolveMoveName,
  resolveMovePower,
  type BattleMove,
  type DamageCalculationContext,
  type DamageCalculationResult,
} from './calculateDamage.js';

export {
  BATTLE_LOG,
  createBattleLogEvent,
  formatDamageLog,
  formatSkillUsedLog,
} from './battleCombatLog.js';

export {
  BattleTurnOwner,
  BattleManager,
  MonsterTurnController,
  processMonsterBehavior,
  type BattleGridLayout,
  type MonsterBehaviorDecision,
  type MonsterBehaviorTurnContext,
  type MonsterTurnResult,
  type PlayerActionValidation,
  type PlayerGridAction,
} from './monsterTurnController.js';

/** @deprecated Use MonsterTurnController */
export { MonsterTurnController as BattleEngine } from './monsterTurnController.js';
