import type { ActionRequest } from '../events.js';
import type { SkillData } from '../types.js';
import { resolveSkillPpMax, skillUsesPpBudget } from './skillRuntime.js';

export const POTION_SATURATION_STEP_PERCENT = 10;
export const POTION_SATURATION_CAP_PERCENT = 100;

export type PotionReactiveConfig = {
  readonly enabled: boolean;
  readonly consumesMainAction: boolean;
  readonly saturationStepPercent?: number;
  readonly saturationCapPercent?: number;
};

/** Poção/tônico no mesmo turno do moveset — não gasta a ação principal. */
export function isReactiveConsumableAction(
  request: ActionRequest,
  config: PotionReactiveConfig,
): boolean {
  return Boolean(
    config.enabled
    && !config.consumesMainAction
    && request.consumableId
    && request.skillId === null,
  );
}

export function resolvePotionSaturationPercent(
  usesInBattle: number,
  stepPercent = POTION_SATURATION_STEP_PERCENT,
  capPercent = POTION_SATURATION_CAP_PERCENT,
): number {
  return Math.min(capPercent, Math.max(0, usesInBattle) * stepPercent);
}

/** Multiplicador de cura antes de incrementar o contador de usos. */
export function resolvePotionHealMultiplierFromUses(
  usesInBattle: number,
  stepPercent = POTION_SATURATION_STEP_PERCENT,
): number {
  const saturation = resolvePotionSaturationPercent(usesInBattle, stepPercent);
  return Math.max(0, 1 - saturation / 100);
}

/** PP removido neste uso de poção (10% do máximo do move, acumula a cada uso na batalha). */
export function resolvePotionPpDrainPerUse(ppMax: number, stepPercent = POTION_SATURATION_STEP_PERCENT): number {
  if (ppMax <= 0) return 0;
  return Math.max(1, Math.floor(ppMax * stepPercent / 100));
}

export type PotionPpDrainResult = {
  readonly skills: SkillData[];
  readonly changed: boolean;
  /** Moves que ficaram com 0 PP após este uso. */
  readonly exhaustedMoveIds: readonly string[];
};

/** Cada poção drena mais um passo — o jogador perde ações conforme o PP real cai. */
export function applyPotionPpDrainStepToSkills(
  skills: readonly SkillData[],
  stepPercent = POTION_SATURATION_STEP_PERCENT,
): PotionPpDrainResult {
  if (stepPercent <= 0) {
    return { skills: [...skills], changed: false, exhaustedMoveIds: [] };
  }

  let changed = false;
  const exhaustedMoveIds: string[] = [];
  const next = skills.map((skill) => {
    if (!skillUsesPpBudget(skill)) return skill;
    const ppMax = resolveSkillPpMax(skill);
    const ppCurrent = skill.ppCurrent ?? ppMax;
    const drain = resolvePotionPpDrainPerUse(ppMax, stepPercent);
    const nextPp = Math.max(0, ppCurrent - drain);
    if (nextPp <= 0) exhaustedMoveIds.push(skill.id);
    if (nextPp === ppCurrent) return skill;
    changed = true;
    return { ...skill, ppMax: skill.ppMax ?? ppMax, ppCurrent: nextPp };
  });

  return { skills: next, changed, exhaustedMoveIds };
}

/** @deprecated Use `applyPotionPpDrainStepToSkills` — dreno é por uso (+step%), não pelo total de saturação de uma vez. */
export function applyPotionPpDrainToSkills(
  skills: readonly SkillData[],
  saturationPercent: number,
  stepPercent = POTION_SATURATION_STEP_PERCENT,
): { readonly skills: SkillData[]; readonly changed: boolean } {
  const uses = Math.min(
    POTION_SATURATION_CAP_PERCENT / stepPercent,
    Math.ceil(saturationPercent / stepPercent),
  );
  let current = [...skills];
  let changed = false;
  for (let i = 0; i < uses; i += 1) {
    const step = applyPotionPpDrainStepToSkills(current, stepPercent);
    current = step.skills;
    if (step.changed) changed = true;
  }
  return { skills: current, changed };
}
