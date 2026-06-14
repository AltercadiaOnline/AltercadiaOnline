import {
  getMarcoNodeProgress,
  resolveEffectiveMarcoAbilityLevel,
  type MarcosNodeProgressionData,
} from '../progression/marcoProgression.js';
import { getMarcoCombatNodeEffect, scaleMarcoModifierValue } from './marcoCombatEffectCatalog.js';
import {
  MarcoCombatModifierKind,
  MarcoCombatProc,
  type MarcoCombatProcId,
} from './marcoCombatEffectCatalog.js';

export type MarcoCombatPassiveAccumulator = {
  speedFlat: number;
  critChanceBonus: number;
  critDamageBonus: number;
  defensePercent: number;
  dodgePercent: number;
  attackPercent: number;
  damageReductionPercent: number;
  exhaustionReductionPercent: number;
};

export type MarcoCombatFlags = {
  readonly beyondTimeStepsCharges: number;
  readonly precisionMasterReady: boolean;
  readonly invincibleBastionEnabled: boolean;
};

export type ResolvedMarcoCombatModifiers = {
  readonly passives: MarcoCombatPassiveAccumulator;
  readonly flags: MarcoCombatFlags;
  readonly activeProcIds: readonly MarcoCombatProcId[];
};

export function emptyMarcoCombatPassiveAccumulator(): MarcoCombatPassiveAccumulator {
  return {
    speedFlat: 0,
    critChanceBonus: 0,
    critDamageBonus: 0,
    defensePercent: 0,
    dodgePercent: 0,
    attackPercent: 0,
    damageReductionPercent: 0,
    exhaustionReductionPercent: 0,
  };
}

export function emptyMarcoCombatFlags(): MarcoCombatFlags {
  return {
    beyondTimeStepsCharges: 0,
    precisionMasterReady: false,
    invincibleBastionEnabled: false,
  };
}

function applyScaledModifier(
  target: MarcoCombatPassiveAccumulator,
  kind: (typeof MarcoCombatModifierKind)[keyof typeof MarcoCombatModifierKind],
  scaled: number,
): void {
  switch (kind) {
    case MarcoCombatModifierKind.SpeedFlat:
      target.speedFlat += scaled;
      break;
    case MarcoCombatModifierKind.CritChance:
      target.critChanceBonus += scaled / 100;
      break;
    case MarcoCombatModifierKind.CritDamage:
      target.critDamageBonus += scaled / 100;
      break;
    case MarcoCombatModifierKind.DefensePercent:
      target.defensePercent += scaled;
      break;
    case MarcoCombatModifierKind.DodgePercent:
      target.dodgePercent += scaled;
      break;
    case MarcoCombatModifierKind.AttackPercent:
      target.attackPercent += scaled;
      break;
    case MarcoCombatModifierKind.DamageReduction:
      target.damageReductionPercent += scaled;
      break;
    case MarcoCombatModifierKind.ExhaustionReduction:
      target.exhaustionReductionPercent += scaled;
      break;
  }
}

/**
 * Soma passivos dos nós Marcos ativos (nível efetivo × catálogo).
 * Procs de ápice só armam com habilidade Marcos Nv. 5 efetivo.
 */
export function resolveMarcoCombatModifiers(input: {
  readonly activeMarcos: readonly string[];
  readonly nodeProgression: MarcosNodeProgressionData;
  readonly playerLevel: number;
}): ResolvedMarcoCombatModifiers {
  const passives = emptyMarcoCombatPassiveAccumulator();
  const flags = { ...emptyMarcoCombatFlags() };
  const activeProcs = new Set<MarcoCombatProcId>();
  const activeSet = new Set(input.activeMarcos);

  for (const nodeId of input.activeMarcos) {
    if (!activeSet.has(nodeId)) continue;

    const effect = getMarcoCombatNodeEffect(nodeId);
    if (!effect) continue;

    const storedLevel = getMarcoNodeProgress(input.nodeProgression, nodeId).level;
    const effectiveLevel = resolveEffectiveMarcoAbilityLevel(storedLevel, input.playerLevel);
    if (effectiveLevel <= 0) continue;

    for (const mod of effect.modifiers) {
      const scaled = scaleMarcoModifierValue(mod.atMaxLevel, effectiveLevel);
      applyScaledModifier(passives, mod.kind, scaled);
    }

    if (effectiveLevel >= 5 && effect.procsAtMaxLevel) {
      for (const proc of effect.procsAtMaxLevel) {
        activeProcs.add(proc);
        if (proc === MarcoCombatProc.BeyondTimeSteps) {
          flags.beyondTimeStepsCharges += 1;
        }
        if (proc === MarcoCombatProc.PrecisionMaster) {
          flags.precisionMasterReady = true;
        }
        if (proc === MarcoCombatProc.InvincibleBastion) {
          flags.invincibleBastionEnabled = true;
        }
      }
    }
  }

  return {
    passives,
    flags,
    activeProcIds: [...activeProcs],
  };
}
