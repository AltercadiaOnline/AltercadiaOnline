/**
 * Nomenclatura padrão de moves na UI — fonte única para tooltips e HUD.
 *
 * - **Poder base** — valor do catálogo que entra em (Ataque classe + poder + Força) − Defesa.
 *   Nunca usar "+N Dano" no tooltip: isso confunde com dano final no alvo.
 * - **Cura base** — valor de cura antes de buffs de cura no turno.
 * - **Golpe / dano final** — só no log de combate (`↳ Golpe X − Defesa Y → Z`).
 */

export const MOVE_BASE_POWER_LABEL = 'Poder base';
export const MOVE_BASE_HEAL_LABEL = 'Cura base';

/** Padrões proibidos em tooltips de move (testes de catálogo). */
export const MOVE_TOOLTIP_FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /\+\d+\s+Dano\b/i,
  /^Dano:\s*\d+/i,
];

export function formatMoveBasePowerLabel(power: number): string {
  return `${MOVE_BASE_POWER_LABEL}: ${power}`;
}

export function formatMoveBaseHealLabel(power: number, statLabel: string, targetHint = ''): string {
  return `${MOVE_BASE_HEAL_LABEL}: +${power} HP (escala com ${statLabel})${targetHint}`;
}

/** Rótulo compacto do golpe na arena — prioriza nome do move. */
export function formatCompactHitMoveLabel(options: {
  readonly moveName?: string;
  readonly movesetPower?: number;
}): string | undefined {
  const trimmed = options.moveName?.trim();
  if (trimmed) return trimmed;
  if (options.movesetPower !== undefined && options.movesetPower > 0) {
    return `Moveset ${options.movesetPower}`;
  }
  return undefined;
}

export function moveTooltipContainsForbiddenDamageLabel(lines: readonly string[]): boolean {
  return lines.some((line) => MOVE_TOOLTIP_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(line)));
}
