import { CombatEventType } from '../events.js';
import type { StatusEvent } from '../events.js';

export type StatusEventPhase = 'applied' | 'renewed' | 'tick' | 'skip' | 'expired';

const STATUS_SHORT_LABELS: Readonly<Record<string, string>> = {
  BURN: 'Queimadura',
  PARALYZE: 'Paralisia',
  CONFUSE: 'Confusão',
  DELAYED_DETONATION: 'Detonação',
  MOVESET_WEAKEN: 'Enfraquecimento',
  LOCK_ENEMY_MOVES: 'Bloqueio de moves',
  RETALIATION_CHARGE: 'Fúria',
  HEAL_ECHO: 'Eco curativo',
  ATTACK_ECHO: 'Eco de ataque',
  STATUS_IMMUNITY: 'Imunidade',
  THORNS: 'Espinhos',
  MARCO_CC_IMMUNE: 'Bastião CC',
  VULNERABLE: 'Vulnerabilidade',
};

function formatTarget(targetLabel?: string): string {
  const label = targetLabel?.trim();
  return label && label.length > 0 ? label : 'O alvo';
}

/** Mensagem legível para HUD / battle log. */
export function buildStatusEventMessage(
  statusId: string,
  phase: StatusEventPhase,
  options?: { readonly amount?: number; readonly targetLabel?: string },
): string {
  const target = formatTarget(options?.targetLabel);
  const amount = options?.amount;
  const shortLabel = STATUS_SHORT_LABELS[statusId] ?? statusId;

  switch (statusId) {
    case 'BURN':
      if (phase === 'applied') return `${target} está queimando!`;
      if (phase === 'renewed') return `A queimadura em ${target} se intensifica!`;
      if (phase === 'tick') return `A queimadura causa ${amount ?? 0} de dano!`;
      if (phase === 'expired') return `A queimadura em ${target} apagou.`;
      break;
    case 'PARALYZE':
      if (phase === 'applied') return `${target} foi paralisado!`;
      if (phase === 'renewed') return `A paralisia em ${target} se prolonga!`;
      if (phase === 'skip') return `Paralisia bloqueou o turno de ${target}!`;
      if (phase === 'expired') return `A paralisia em ${target} terminou.`;
      break;
    case 'CONFUSE':
      if (phase === 'applied') return `${target} está confuso!`;
      if (phase === 'renewed') return `A confusão em ${target} se prolonga!`;
      if (phase === 'tick') return `A confusão causa ${amount ?? 0} de dano!`;
      if (phase === 'skip') return `A confusão impediu a ação de ${target}!`;
      if (phase === 'expired') return `A confusão em ${target} terminou.`;
      break;
    case 'DELAYED_DETONATION':
      if (phase === 'applied') return `Detonação programada em ${target}!`;
      if (phase === 'renewed') return `A detonação em ${target} foi reforçada!`;
      if (phase === 'tick') return `Detonação explode causando ${amount ?? 0} de dano!`;
      if (phase === 'expired') return `A detonação em ${target} dissipou.`;
      break;
    case 'HEAL_ECHO':
      if (phase === 'applied') return `Eco curativo ativo em ${target}!`;
      if (phase === 'renewed') return `O eco curativo em ${target} se renova!`;
      if (phase === 'tick') return `Eco curativo restaura ${amount ?? 0} HP em ${target}!`;
      if (phase === 'expired') return `O eco curativo em ${target} terminou.`;
      break;
    case 'ATTACK_ECHO':
      if (phase === 'applied') return `${target} preparou eco de ataque!`;
      if (phase === 'renewed') return `O eco de ataque em ${target} se renova!`;
      if (phase === 'tick') return `Eco de ataque causa ${amount ?? 0} de dano!`;
      if (phase === 'expired') return `O eco de ataque em ${target} terminou.`;
      break;
    case 'THORNS':
      if (phase === 'applied') return `Espinhos protegem ${target}!`;
      if (phase === 'renewed') return `Os espinhos em ${target} se renovam!`;
      if (phase === 'expired') return `Os espinhos em ${target} caíram.`;
      break;
    case 'STATUS_IMMUNITY':
      if (phase === 'applied') return `${target} está imune a status!`;
      if (phase === 'renewed') return `Imunidade a status renovada em ${target}!`;
      if (phase === 'expired') return `A imunidade em ${target} terminou.`;
      break;
    case 'VULNERABLE':
      if (phase === 'applied') return `${target} está vulnerável!`;
      if (phase === 'renewed') return `A vulnerabilidade em ${target} se prolonga!`;
      if (phase === 'expired') return `${target} deixou de estar vulnerável.`;
      break;
    case 'LOCK_ENEMY_MOVES':
      if (phase === 'applied') return `Moves bloqueados em ${target}!`;
      if (phase === 'renewed') return `O bloqueio de moves em ${target} continua!`;
      if (phase === 'expired') return `Os moves de ${target} foram liberados.`;
      break;
    case 'MOVESET_WEAKEN':
      if (phase === 'applied') return `${target} está enfraquecido!`;
      if (phase === 'renewed') return `O enfraquecimento em ${target} se prolonga!`;
      if (phase === 'expired') return `${target} recuperou força.`;
      break;
    case 'RETALIATION_CHARGE':
      if (phase === 'applied') return `${target} acumula fúria!`;
      if (phase === 'renewed') return `Fúria acumulada em ${target}!`;
      if (phase === 'expired') return `A fúria de ${target} dissipou.`;
      break;
    case 'MARCO_CC_IMMUNE':
      if (phase === 'applied') return `${target} está imune a CC!`;
      if (phase === 'renewed') return `Bastião CC renovado em ${target}!`;
      if (phase === 'expired') return `O bastião CC em ${target} terminou.`;
      break;
    default:
      break;
  }

  switch (phase) {
    case 'applied':
      return `${shortLabel} aplicado em ${target}!`;
    case 'renewed':
      return `${shortLabel} renovado em ${target}!`;
    case 'tick':
      return amount !== undefined
        ? `${shortLabel} causa ${amount} de efeito em ${target}!`
        : `${shortLabel} surte efeito em ${target}!`;
    case 'skip':
      return `${shortLabel} bloqueou o turno de ${target}!`;
    case 'expired':
      return `${shortLabel} terminou em ${target}.`;
    default:
      return `${shortLabel} — ${target}.`;
  }
}

export function createStatusCombatEvent(params: {
  readonly battleId: string;
  readonly targetId: string;
  readonly statusId: string;
  readonly phase: StatusEventPhase;
  readonly message?: string;
  readonly amount?: number;
  readonly targetLabel?: string;
}): StatusEvent {
  const message = params.message ?? buildStatusEventMessage(params.statusId, params.phase, {
    ...(params.amount !== undefined ? { amount: params.amount } : {}),
    ...(params.targetLabel ? { targetLabel: params.targetLabel } : {}),
  });

  return {
    type: CombatEventType.STATUS_EVENT,
    payload: {
      battleId: params.battleId,
      targetId: params.targetId,
      statusId: params.statusId,
      phase: params.phase,
      message,
      ...(params.amount !== undefined ? { amount: params.amount } : {}),
    },
  };
}
