import type { SkillData } from '../types.js';

import {

  MOVE_MAX_LEVEL,

  MOVE_PP_BONUS_INTERVAL,

  MOVE_POWER_GROWTH_PER_LEVEL,

  resolveMoveProgressionFromMastery,

} from './moveProgression.js';



/** Nível efetivo para escala de combate (0 no domínio 1, até MOVE_MAX_LEVEL - 1). */

export function resolveMoveCombatScaleLevel(totalMasteryXp: number, moveId = ''): number {

  const { level } = resolveMoveProgressionFromMastery(moveId, totalMasteryXp);

  return Math.min(MOVE_MAX_LEVEL - 1, Math.max(0, level - 1));

}



/** Aplica bônus de domínio (power + PP) sobre o template base do movimento. */

export function applyMoveMasteryToSkillData(

  skill: SkillData,

  totalMasteryXp: number,

): SkillData {

  const scaleLevel = resolveMoveCombatScaleLevel(totalMasteryXp, skill.id);

  const basePower = skill.basePower ?? skill.damage;

  const scaledPower = Math.max(

    1,

    Math.floor(basePower * (1 + MOVE_POWER_GROWTH_PER_LEVEL * scaleLevel)),

  );

  const ppBonus = Math.floor(scaleLevel / MOVE_PP_BONUS_INTERVAL);

  const templatePp = skill.ppMax ?? skill.ppCurrent ?? 0;

  const ppMax = Math.max(1, templatePp + ppBonus);



  return {

    ...skill,

    damage: scaledPower,

    basePower: scaledPower,

    ppMax,

    ppCurrent: ppMax,

  };

}


