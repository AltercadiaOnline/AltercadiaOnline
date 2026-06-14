import { CLASS_CATALOG, type ClassType } from '../types/classes.js';

export function formatCombatClassLabel(classId: ClassType | undefined | null): string {
  if (!classId) return '—';
  return CLASS_CATALOG[classId].name;
}

export function formatLevelWithClass(level: number, classId: ClassType | undefined | null): string {
  const classLabel = formatCombatClassLabel(classId);
  if (classLabel === '—') return `Nv. ${level}`;
  return `Nv. ${level} · ${classLabel}`;
}

export function formatSpriteMetaLine(
  displayName: string,
  level: number,
  classId: ClassType | undefined | null,
): string {
  const classLabel = formatCombatClassLabel(classId);
  if (classLabel === '—') return `${displayName} · Nv.${level}`;
  return `${displayName} · ${classLabel} · Nv.${level}`;
}
