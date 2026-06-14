import type { CombatRuleEntry, CombatRuleManifest } from '../../shared/combat/combatRuleManifest.js';
import { getClassMoveById, isClassMoveId, MoveEffectKind } from '../../shared/combat/classMovesetCatalog.js';
import { resolveMoveCombatMeta } from '../../shared/combat/resolveMoveCombatMeta.js';
import { MoveCategory } from '../../shared/combat/moveTypes.js';
import { MoveTargetType } from '../../shared/combat/battleTargeting.js';

export type MutableCombatRuleManifest = CombatRuleEntry[];

export function cloneManifest(manifest: CombatRuleManifest): MutableCombatRuleManifest {
  return manifest.map((entry) => ({ ...entry }));
}

/** Mapeia skill usada para trigger de runa (defesa / dash / impacto). */
export function resolveSkillRuneTrigger(skillId: string | null): CombatRuleEntry['trigger'] | null {
  if (!skillId) return null;
  if (isClassMoveId(skillId)) {
    const kind = getClassMoveById(skillId).effectKind;
    if (kind === MoveEffectKind.OutOfTurn) return 'DASH';
  }
  const meta = resolveMoveCombatMeta(skillId);
  if (!meta) return 'IMPACT';
  if (meta.targetType === MoveTargetType.Self && meta.category === MoveCategory.Defense) {
    return 'BLOCK';
  }
  if (meta.targetType === MoveTargetType.Tile) {
    return 'DASH';
  }
  return 'IMPACT';
}

export function tryConsumeRuneCharge(
  manifest: MutableCombatRuleManifest,
  trigger: CombatRuleEntry['trigger'],
): CombatRuleEntry | null {
  const index = manifest.findIndex(
    (entry) => entry.trigger === trigger && (entry.charges ?? 0) > 0,
  );
  if (index < 0) return null;

  const entry = manifest[index]!;
  const nextCharges = (entry.charges ?? 1) - 1;
  if (nextCharges <= 0) {
    manifest.splice(index, 1);
  } else {
    manifest[index] = { ...entry, charges: nextCharges };
  }
  return entry;
}

export function remainingRuneCharges(manifest: CombatRuleManifest): number {
  return manifest.reduce((sum, entry) => sum + (entry.charges ?? 0), 0);
}
