import type { CombatClassId } from '../types.js';
import { MoveEffectKind, type MoveEffectKind as MoveEffectKindType } from './classMovesetCatalog.js';

/** Perfil de gameplay — como o move ajuda a baixar HP / controlar o ritmo. */
export const MoveGameplayRole = {
  Burst: 'burst',
  Ramp: 'ramp',
  Dot: 'dot',
  Setup: 'setup',
  Sustain: 'sustain',
  Defense: 'defense',
} as const;

export type MoveGameplayRoleId = (typeof MoveGameplayRole)[keyof typeof MoveGameplayRole];

export const MOVE_GAMEPLAY_ROLE_LABELS: Record<MoveGameplayRoleId, string> = {
  [MoveGameplayRole.Burst]: 'Burst — dano imediato',
  [MoveGameplayRole.Ramp]: 'Ramp — cresce com repetição ou fúria',
  [MoveGameplayRole.Dot]: 'DoT — dano ao longo dos turnos',
  [MoveGameplayRole.Setup]: 'Setup — abre janela / debuff antes do payoff',
  [MoveGameplayRole.Sustain]: 'Sustain — cura ou recurso',
  [MoveGameplayRole.Defense]: 'Defense — reduz dano recebido / contra-ataca',
};

const ROLE_BY_EFFECT: Partial<Record<MoveEffectKindType, MoveGameplayRoleId>> = {
  [MoveEffectKind.PureDamage]: MoveGameplayRole.Burst,
  [MoveEffectKind.HighRiskBurst]: MoveGameplayRole.Burst,
  [MoveEffectKind.AoeDamage]: MoveGameplayRole.Burst,
  [MoveEffectKind.IgnoreBarrier]: MoveGameplayRole.Burst,
  [MoveEffectKind.OutOfTurn]: MoveGameplayRole.Burst,
  [MoveEffectKind.RandomDamage]: MoveGameplayRole.Burst,
  [MoveEffectKind.StackingDamage]: MoveGameplayRole.Ramp,
  [MoveEffectKind.AttackEcho]: MoveGameplayRole.Ramp,
  [MoveEffectKind.RetaliationStrike]: MoveGameplayRole.Ramp,
  [MoveEffectKind.AttackStack]: MoveGameplayRole.Ramp,
  [MoveEffectKind.ApplyBurn]: MoveGameplayRole.Dot,
  [MoveEffectKind.DelayedDetonation]: MoveGameplayRole.Dot,
  [MoveEffectKind.Confuse]: MoveGameplayRole.Dot,
  [MoveEffectKind.DebuffScalingDamage]: MoveGameplayRole.Setup,
  [MoveEffectKind.ApplyParalyze]: MoveGameplayRole.Setup,
  [MoveEffectKind.MovesetWeaken]: MoveGameplayRole.Setup,
  [MoveEffectKind.LockEnemyMoves]: MoveGameplayRole.Setup,
  [MoveEffectKind.InvertDebuff]: MoveGameplayRole.Setup,
  [MoveEffectKind.CopyLastMove]: MoveGameplayRole.Setup,
  [MoveEffectKind.PlaceTrap]: MoveGameplayRole.Setup,
  [MoveEffectKind.PpDrain]: MoveGameplayRole.Setup,
  [MoveEffectKind.Heal]: MoveGameplayRole.Sustain,
  [MoveEffectKind.SelfShield]: MoveGameplayRole.Defense,
  [MoveEffectKind.GroupShield]: MoveGameplayRole.Defense,
  [MoveEffectKind.StatusImmunity]: MoveGameplayRole.Defense,
  [MoveEffectKind.Thorns]: MoveGameplayRole.Defense,
  [MoveEffectKind.DamageMirror]: MoveGameplayRole.Defense,
};

export function resolveMoveGameplayRole(effectKind: MoveEffectKindType): MoveGameplayRoleId {
  return ROLE_BY_EFFECT[effectKind] ?? MoveGameplayRole.Burst;
}

export function formatMoveGameplayRoleLine(effectKind: MoveEffectKindType): string {
  const role = resolveMoveGameplayRole(effectKind);
  return `Perfil: ${MOVE_GAMEPLAY_ROLE_LABELS[role]}`;
}

/**
 * Loadout ativo padrão (4 slots) — mix burst / ramp / DoT / setup por classe.
 * Cura canônica fica no pool de 6, fora dos 4 iniciais (troca no painel de moveset).
 */
export const CLASS_DEFAULT_ACTIVE_LOADOUT: Readonly<Record<CombatClassId, readonly string[]>> = {
  IMPETUS: ['IMP_1', 'IMP_2', 'IMP_4', 'IMP_6'],
  COGITOR: ['COG_1', 'COG_3', 'COG_2', 'COG_4'],
  TUTATOR: ['TUT_1', 'TUT_6', 'TUT_5', 'TUT_2'],
  DISSOLUTUS: ['DIS_1', 'DIS_5', 'DIS_3', 'DIS_2'],
};
