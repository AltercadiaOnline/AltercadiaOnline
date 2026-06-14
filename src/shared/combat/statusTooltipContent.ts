import { RuntimeStatusId } from '../types/combat.js';
import { isRuntimePermanentDuration } from './runtimeActorTiming.js';

export type StatusTooltipChipContext = {
  readonly stacks: number;
  readonly turnsRemaining: number;
};

const STATUS_TOOLTIP_TITLES: Readonly<Record<string, string>> = {
  BURN: 'Queimadura',
  PARALYZE: 'Paralisia',
  CONFUSE: 'Confusão',
  DELAYED_DETONATION: 'Detonação',
  MOVESET_WEAKEN: 'Enfraquecimento',
  LOCK_ENEMY_MOVES: 'Bloqueio de moves',
  RETALIATION_CHARGE: 'Fúria',
  HEAL_ECHO: 'Eco curativo',
  ATTACK_ECHO: 'Eco de ataque',
  STATUS_IMMUNITY: 'Imunidade a status',
  THORNS: 'Espinhos',
  MARCO_CC_IMMUNE: 'Bastião CC',
  VULNERABLE: 'Vulnerabilidade',
};

const STATUS_TOOLTIP_DESCRIPTIONS: Readonly<Record<string, string>> = {
  BURN: 'Perde HP a cada turno enquanto queimar.',
  PARALYZE: 'Chance de perder o turno; recebe menos buffs.',
  CONFUSE: 'Chance de falhar a ação no turno.',
  DELAYED_DETONATION: 'Explode após os turnos restantes, causando dano extra.',
  MOVESET_WEAKEN: 'Reduz dano e cura causados.',
  LOCK_ENEMY_MOVES: 'Restringe moves disponíveis no turno.',
  RETALIATION_CHARGE: 'Acumula dano recebido. Retribuição de Impacto ganha bônus de ATK.',
  HEAL_ECHO: 'Parte da cura se repete nos turnos seguintes.',
  ATTACK_ECHO: 'Parte do dano de ataque se repete nos turnos seguintes.',
  STATUS_IMMUNITY: 'Bloqueia novos debuffs.',
  THORNS: 'Devolve parte do dano ao atacante.',
  MARCO_CC_IMMUNE: 'Imune a paralisia, confusão e bloqueio de moves.',
  VULNERABLE: 'Recebe +20% de dano.',
};

export function resolveStatusTooltipTitle(statusId: string): string {
  return STATUS_TOOLTIP_TITLES[statusId] ?? statusId;
}

export function buildStatusTooltipLines(
  statusId: string,
  chip: StatusTooltipChipContext,
): readonly string[] {
  const lines: string[] = [];
  const description = STATUS_TOOLTIP_DESCRIPTIONS[statusId];
  if (description) {
    lines.push(description);
  }

  if (statusId === RuntimeStatusId.RetaliationCharge) {
    lines.push('Ativo até usar Retribuição de Impacto.');
    if (chip.stacks > 0) {
      lines.push(`Bônus acumulado: +${chip.stacks}% ATK.`);
    }
    return lines;
  }

  if (
    chip.turnsRemaining > 0
    && !isRuntimePermanentDuration(chip.turnsRemaining)
  ) {
    lines.push(`Restam ${chip.turnsRemaining} turno(s).`);
  }

  if (chip.stacks > 1) {
    lines.push(`Intensidade: x${chip.stacks}.`);
  }

  return lines;
}
