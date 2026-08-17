/** Modificadores pós-subtração (autoridade: CombatEngine.applyDirectDamage). */

export type CombatHitMitigationSnapshot = {
  readonly vulnerableApplied?: boolean;
  readonly isCritical?: boolean;
  readonly critBonusPercent?: number;
  readonly minDamageFloorApplied?: boolean;
  /** Dano após fórmula (crit/vuln/mín.), antes de escudo e redução %. */
  readonly damageBeforeMitigation?: number;
  readonly shieldAbsorbed?: number;
  readonly incomingReductionPercent?: number;
};

export type CombatHitMitigationPayloadFields = {
  readonly isCritical?: boolean;
  readonly critBonusPercent?: number;
  readonly vulnerableApplied?: boolean;
  readonly minDamageFloorApplied?: boolean;
  readonly damageBeforeMitigation?: number;
  readonly shieldAbsorbed?: number;
  readonly incomingReductionPercent?: number;
};

export function pickCombatHitMitigation(
  payload: CombatHitMitigationPayloadFields,
): CombatHitMitigationSnapshot | undefined {
  const snapshot: CombatHitMitigationSnapshot = {
    ...(payload.vulnerableApplied ? { vulnerableApplied: true } : {}),
    ...(payload.isCritical ? { isCritical: true } : {}),
    ...(payload.critBonusPercent !== undefined && payload.critBonusPercent > 0
      ? { critBonusPercent: Math.round(payload.critBonusPercent) }
      : {}),
    ...(payload.minDamageFloorApplied ? { minDamageFloorApplied: true } : {}),
    ...(payload.damageBeforeMitigation !== undefined
      ? { damageBeforeMitigation: payload.damageBeforeMitigation }
      : {}),
    ...(payload.shieldAbsorbed !== undefined && payload.shieldAbsorbed > 0
      ? { shieldAbsorbed: payload.shieldAbsorbed }
      : {}),
    ...(payload.incomingReductionPercent !== undefined && payload.incomingReductionPercent > 0
      ? { incomingReductionPercent: payload.incomingReductionPercent }
      : {}),
  };

  return Object.keys(snapshot).length > 0 ? snapshot : undefined;
}

/** Passos legíveis entre net (golpe − defesa) e dano final. */
export function formatCombatHitMitigationSteps(
  baseNet: number,
  mitigation?: CombatHitMitigationSnapshot,
): readonly string[] {
  if (!mitigation) return [];

  const steps: string[] = [];
  if (mitigation.vulnerableApplied) steps.push('Vulnerável +20%');
  if (mitigation.isCritical) {
    const pct = mitigation.critBonusPercent;
    steps.push(pct !== undefined && pct > 0 ? `Crítico +${Math.round(pct)}%` : 'Crítico');
  }
  if (mitigation.minDamageFloorApplied && baseNet <= 0) steps.push('Mín. 1');
  if (mitigation.shieldAbsorbed !== undefined && mitigation.shieldAbsorbed > 0) {
    steps.push(`Escudo −${Math.round(mitigation.shieldAbsorbed)}`);
  }
  if (mitigation.incomingReductionPercent !== undefined && mitigation.incomingReductionPercent > 0) {
    steps.push(`Redução −${Math.round(mitigation.incomingReductionPercent)}%`);
  }
  return steps;
}

export function buildCombatHitResultLine(
  attackTotal: number,
  defenseTotal: number,
  damageReceived: number,
  mitigation?: CombatHitMitigationSnapshot,
): string {
  const baseNet = Math.max(0, Math.round(attackTotal) - Math.round(defenseTotal));
  const steps = formatCombatHitMitigationSteps(baseNet, mitigation);
  const attack = Math.round(attackTotal);
  const defense = Math.round(defenseTotal);
  const damage = Math.max(0, Math.round(damageReceived));

  if (steps.length === 0) {
    let line = `Golpe ${attack} − Defesa ${defense} → Dano recebido = ${damage}`;
    if (damage > 0 && baseNet !== damage) line += ' (crítico ou efeito)';
    return line;
  }

  return `Golpe ${attack} − Defesa ${defense} = ${baseNet} → ${steps.join(' → ')} → Dano recebido = ${damage}`;
}
