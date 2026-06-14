import type { Skill, SkillData } from '../types.js';

/**
 * Paleta de batalha: os 4 slots vêm do loadout confirmado; o servidor só enriquece PP/cooldown.
 * Nunca descarta um move do loadout por falta de match no snapshot (ex.: TURN_START antes do catálogo).
 */
export function mergeLoadoutSkillsWithRuntime(
  loadoutSkills: readonly SkillData[],
  serverSkills: readonly Skill[],
): Skill[] {
  if (loadoutSkills.length === 0) {
    return [...serverSkills];
  }

  return loadoutSkills.map((skill) => {
    const runtime = serverSkills.find((entry) => entry.id === skill.id);
    if (!runtime) {
      return { ...skill };
    }

    const merged: Skill = {
      id: skill.id,
      name: skill.name,
      damage: runtime.damage ?? skill.damage,
      cooldown: runtime.cooldown ?? skill.cooldown,
    };

    const ppCurrent = runtime.ppCurrent ?? skill.ppCurrent;
    const ppMax = runtime.ppMax ?? skill.ppMax;
    const priority = runtime.priority ?? skill.priority;
    const cooldownTurnsRemaining =
      runtime.cooldownTurnsRemaining ?? skill.cooldownTurnsRemaining;

    return {
      ...merged,
      ...(priority !== undefined ? { priority } : {}),
      ...(ppCurrent !== undefined ? { ppCurrent } : {}),
      ...(ppMax !== undefined ? { ppMax } : {}),
      ...(cooldownTurnsRemaining !== undefined ? { cooldownTurnsRemaining } : {}),
    };
  });
}
