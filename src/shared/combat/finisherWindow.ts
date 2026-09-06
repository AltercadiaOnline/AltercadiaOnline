import { MoveEffectKind } from './classMovesetCatalog.js';
import type { SkillData } from '../types/combat.js';

/** Nome HUD — janela de setup → Fúria (Impetus piloto). */
export const FINISHER_WINDOW_STATUS_NAME = 'Janela de Finisher';

/** Bônus padrão de Fúria Suicida dentro da janela. */
export const DEFAULT_FINISHER_WINDOW_BONUS_PERCENT = 45;

/** Autodano padrão fora da janela (catálogo IMP_6). */
export const DEFAULT_FINISHER_SELF_DAMAGE_PERCENT = 35;

/** Autodano reduzido na janela (não zero). */
export const DEFAULT_FINISHER_SELF_DAMAGE_IN_WINDOW_PERCENT = 18;

export function isFinisherSkill(skill: Pick<SkillData, 'effectKind' | 'id'>): boolean {
  return skill.effectKind === MoveEffectKind.HighRiskBurst || skill.id === 'IMP_6';
}

export function resolveFinisherWindowTurns(
  params: Readonly<Record<string, number>> | undefined,
): number {
  const raw = params?.finisherWindowTurns;
  if (raw === undefined || raw <= 0) return 0;
  return Math.max(1, Math.floor(raw));
}

export function resolveFinisherBurstPower(
  basePower: number,
  params: Readonly<Record<string, number>> | undefined,
  inWindow: boolean,
): number {
  if (!inWindow || basePower <= 0) return basePower;
  const bonus = Math.max(
    0,
    Math.floor(params?.finisherWindowBonusPercent ?? DEFAULT_FINISHER_WINDOW_BONUS_PERCENT),
  );
  return Math.max(1, Math.floor(basePower * (1 + bonus / 100)));
}

export function resolveFinisherSelfDamagePercent(
  params: Readonly<Record<string, number>> | undefined,
  inWindow: boolean,
): number {
  if (inWindow) {
    return Math.max(
      1,
      Math.floor(
        params?.selfDamageInWindowPercent ?? DEFAULT_FINISHER_SELF_DAMAGE_IN_WINDOW_PERCENT,
      ),
    );
  }
  return Math.max(
    1,
    Math.floor(params?.selfDamagePercent ?? DEFAULT_FINISHER_SELF_DAMAGE_PERCENT),
  );
}

/** Eco do Preparo só no finisher quando o catálogo marca `echoFinisherOnly`. */
export function shouldEchoOnlyOnFinisher(
  echoMetadata: Readonly<Record<string, number>> | undefined,
): boolean {
  return (echoMetadata?.echoFinisherOnly ?? 0) > 0;
}
