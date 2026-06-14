import type { CombatEvent } from '../../../shared/events.js';
import { CombatEventType } from '../../../shared/events.js';
import type { Combatant } from '../../../shared/types.js';
import {
  sumAttackBreakdownTotal,
  sumDefenseBreakdownTotal,
} from '../../../shared/combat/combatBreakdownBuilder.js';
import { formatCombatHitLogFormula } from '../../../shared/combat/combatHitLogFormula.js';
import { formatCombatActionRejection } from '../../../shared/combat/actionRejectionMessages.js';
import { resolveMoveDefinitionForUi } from '../../../shared/combat/movesetLoadout.js';
import type { BattleLogEmitter } from './battleLogColors.js';
import {
  formatBattleStarted,
  formatEnemyDamage,
  formatEnemySkillUsed,
  formatPlayerDamageDealt,
  formatPlayerDamageReceived,
  formatPlayerSkillUsed,
  formatPetDamageDealt,
  formatPetSkillUsed,
} from './battleLogNarrative.js';

export type BattleLogTone = 'damage-dealt' | 'damage-received' | 'skill' | 'neutral' | 'alert';

export type BattleLogLineKind = 'narrative' | 'formula';

export type BattleNarrativeLine = {
  readonly text: string;
  /** Emissor visual — player (azul), enemy (vermelho), system (amarelo). */
  readonly emitter: BattleLogEmitter;
  readonly tone?: BattleLogTone;
  /** `formula` = linha de matemática do hit (indent visual no log). */
  readonly kind?: BattleLogLineKind;
};

export type BattleNarratorContext = {
  readonly playerActorId: string | null;
  readonly combatants: Readonly<Record<string, Combatant>>;
};

const HIDDEN_LINE_PATTERNS: readonly RegExp[] = [
  /^action accepted/i,
  /^skills synced for/i,
  /^damage pipeline/i,
  /\bhpafter=/i,
  /\bbase=/i,
  /\bfinal=/i,
  /^ordem:/i,
  /→.*\(INITIATIVE|PRIORITY|SPEED|SEED\)/i,
  /^.+\s+causou\s+\d+\s+de\s+dano!?$/i,
  /^.+\s+usou\s+.+[^!]\s*$/,
];

const ACTOR_USED_SKILL = /^actor\s+(\S+)\s+used\s+(\S+)/i;
const ID_ARROW_DAMAGE = /^(\S+)\s*->\s*(\S+)\s*\((\d+)\)/i;
const SKILL_LABEL_OVERRIDES: Readonly<Record<string, string>> = {
  crow_peck: 'Bicada',
  rat_bite: 'Mordida',
  wild_dog_bite: 'Mordida',
  spider_bite: 'Mordida',
  minotaur_charge: 'Investida',
  minotaur_gore: 'Chifradas',
  specter_wail: 'Lamento',
  specter_phase: 'Deslocamento',
  bat_screech: 'Guincho',
};

export function createBattleNarratorContext(
  combatants: Readonly<Record<string, Combatant>> = {},
  playerActorId: string | null = null,
): BattleNarratorContext {
  return { combatants, playerActorId };
}

/** Converte evento de combate em linhas do BATTLE_LOG (0–N). */
export function narrateCombatEventLines(
  event: CombatEvent,
  ctx: BattleNarratorContext,
): readonly BattleNarrativeLine[] {
  switch (event.type) {
    case CombatEventType.BATTLE_START:
      return [{ text: formatBattleStarted(), emitter: 'SYSTEM', tone: 'neutral' }];

    case CombatEventType.DAMAGE_DEALT: {
      const main = narrateDamage(
        event.payload.sourceId,
        event.payload.targetId,
        event.payload.amount,
        ctx,
      );
      const formula = narrateDamageFormula(event.payload, ctx);
      return formula ? [main, formula] : [main];
    }

    case CombatEventType.HEAL_APPLIED: {
      const heal = narrateHeal(event.payload, ctx);
      return heal ? [heal] : [];
    }

    case CombatEventType.COMBAT_LOG: {
      const line = narrateRawLogLine(event.line, ctx);
      return line ? [line] : [];
    }

    case CombatEventType.ACTION_ACCEPTED:
      return [];

    case CombatEventType.ACTION_REJECTED: {
      if (
        ctx.playerActorId
        && event.payload.actorId !== ctx.playerActorId
      ) {
        return [];
      }
      return [{
        text: formatCombatActionRejection(event.payload.reason),
        emitter: 'SYSTEM',
        tone: 'alert',
      }];
    }

    case CombatEventType.STATUS_EVENT:
      return [{
        text: event.payload.message,
        emitter: resolveStatusEventEmitter(event.payload.targetId, ctx),
        tone: event.payload.phase === 'skip' ? 'alert' : 'neutral',
      }];

    case CombatEventType.SKILL_CATALOG:
    case CombatEventType.TURN_ORDER_RESOLVED:
      return [];

    default:
      return [];
  }
}

/** Converte evento de combate em linha narrativa (ou null para ocultar). */
export function narrateCombatEvent(
  event: CombatEvent,
  ctx: BattleNarratorContext,
): BattleNarrativeLine | null {
  const lines = narrateCombatEventLines(event, ctx);
  return lines[0] ?? null;
}

function narrateDamageFormula(
  payload: Extract<CombatEvent, { type: typeof CombatEventType.DAMAGE_DEALT }>['payload'],
  ctx: BattleNarratorContext,
): BattleNarrativeLine | null {
  const { attackBreakdown, defenseBreakdown, amount } = payload;
  if (!attackBreakdown && !defenseBreakdown) return null;

  const text = formatCombatHitLogFormula({
    damageReceived: amount,
    ...(attackBreakdown
      ? { attackBreakdown, attackTotal: sumAttackBreakdownTotal(attackBreakdown) }
      : {}),
    ...(defenseBreakdown
      ? { defenseBreakdown, defenseTotal: sumDefenseBreakdownTotal(defenseBreakdown) }
      : {}),
  });
  if (!text) return null;

  const main = narrateDamage(payload.sourceId, payload.targetId, amount, ctx);
  return {
    text,
    emitter: main.emitter,
    ...(main.tone !== undefined ? { tone: main.tone } : {}),
    kind: 'formula',
  };
}

function narrateHeal(
  payload: Extract<CombatEvent, { type: typeof CombatEventType.HEAL_APPLIED }>['payload'],
  ctx: BattleNarratorContext,
): BattleNarrativeLine | null {
  const amount = Math.max(0, Math.floor(payload.amount));
  if (amount <= 0) return null;

  const targetName = resolveEntityName(payload.targetId, ctx);
  const isPlayer = ctx.playerActorId && payload.targetId === ctx.playerActorId;
  const isPet = payload.targetId.startsWith('pet_');

  if (isPlayer) {
    return {
      text: `↳ Cura +${amount} HP`,
      emitter: 'PLAYER',
      tone: 'neutral',
      kind: 'formula',
    };
  }

  if (isPet) {
    return {
      text: `↳ ${targetName} recuperou +${amount} HP`,
      emitter: 'PLAYER',
      tone: 'neutral',
      kind: 'formula',
    };
  }

  return {
    text: `↳ ${targetName} recuperou +${amount} HP`,
    emitter: 'ENEMY',
    tone: 'neutral',
    kind: 'formula',
  };
}

/** Traduz linha crua do servidor / legado antes de exibir no BATTLE_LOG. */
export function narrateRawLogLine(
  line: string,
  ctx: BattleNarratorContext,
): BattleNarrativeLine | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (shouldHideLine(trimmed)) return null;

  const idDamage = trimmed.match(ID_ARROW_DAMAGE);
  if (idDamage) {
    const [, sourceId, targetId, amountStr] = idDamage;
    if (sourceId && targetId && amountStr) {
      return narrateDamage(sourceId, targetId, Number(amountStr), ctx);
    }
  }

  const actorSkill = trimmed.match(ACTOR_USED_SKILL);
  if (actorSkill) {
    const [, actorId, skillId] = actorSkill;
    if (actorId && skillId) {
      return narrateSkillUse(actorId, skillId, ctx);
    }
  }

  if (/^battle started:/i.test(trimmed)) {
    return { text: formatBattleStarted(), emitter: 'SYSTEM', tone: 'neutral' };
  }

  const skillUsed = trimmed.match(/^(.+?)\s+usou\s+(.+?)!?$/i);
  if (skillUsed) {
    const [, actorLabel, moveLabel] = skillUsed;
    if (actorLabel && moveLabel) {
      const actorId = resolveActorIdFromLabel(actorLabel.trim(), ctx);
      const skillId = moveLabel.trim();
      if (actorId) {
        return narrateSkillUse(actorId, skillId, ctx);
      }
      const actorName = stripInternalIds(actorLabel.trim());
      const moveName = stripInternalIds(moveLabel.trim());
      return {
        text: formatEnemySkillUsed(actorName, moveName),
        emitter: 'ENEMY',
        tone: 'skill',
      };
    }
  }

  const damageCaused = trimmed.match(/^(.+?)\s+causou\s+(\d+)\s+de\s+dano!?$/i);
  if (damageCaused) {
    const [, sourceLabel, amountStr] = damageCaused;
    if (sourceLabel && amountStr) {
      const sourceId = resolveActorIdFromLabel(sourceLabel.trim(), ctx);
      const amount = Number(amountStr);
      const sourceName = sourceId
        ? resolveEntityName(sourceId, ctx)
        : stripInternalIds(sourceLabel.trim());
      const opponent = findOpponentName(ctx, sourceId);
      if (sourceId && sourceId === ctx.playerActorId && opponent) {
        return {
          text: formatPlayerDamageDealt(opponent, amount),
          emitter: 'PLAYER',
          tone: 'damage-dealt',
        };
      }
      if (sourceId === ctx.playerActorId) {
        return {
          text: `Você causou ${amountStr} de dano!`,
          emitter: 'PLAYER',
          tone: 'damage-dealt',
        };
      }
      return {
        text: opponent
          ? formatEnemyDamage(sourceName, opponent, amount)
          : `${sourceName} causou ${amountStr} de dano!`,
        emitter: 'ENEMY',
        tone: 'skill',
      };
    }
  }

  if (/fugiu da batalha/i.test(trimmed)) {
    return {
      text: stripInternalIds(trimmed),
      emitter: 'SYSTEM',
      tone: 'neutral',
    };
  }

  return {
    text: stripInternalIds(trimmed),
    emitter: 'SYSTEM',
    tone: 'neutral',
  };
}

function narrateDamage(
  sourceId: string,
  targetId: string,
  amount: number,
  ctx: BattleNarratorContext,
): BattleNarrativeLine {
  const targetName = resolveEntityName(targetId, ctx);
  const sourceName = resolveEntityName(sourceId, ctx);
  const dmg = Math.max(0, Math.floor(amount));

  if (sourceId.startsWith('pet_')) {
    return {
      text: formatPetDamageDealt(sourceName, targetName, dmg),
      emitter: 'PLAYER',
      tone: 'damage-dealt',
    };
  }

  if (ctx.playerActorId && sourceId === ctx.playerActorId) {
    return {
      text: formatPlayerDamageDealt(targetName, dmg),
      emitter: 'PLAYER',
      tone: 'damage-dealt',
    };
  }

  if (ctx.playerActorId && targetId === ctx.playerActorId) {
    return {
      text: formatPlayerDamageReceived(sourceName, dmg),
      emitter: 'ENEMY',
      tone: 'damage-received',
    };
  }

  return {
    text: formatEnemyDamage(sourceName, targetName, dmg),
    emitter: 'ENEMY',
    tone: 'neutral',
  };
}

function narrateSkillUse(
  actorId: string,
  skillId: string,
  ctx: BattleNarratorContext,
): BattleNarrativeLine {
  const skillName = resolveSkillName(skillId, ctx.combatants[actorId]);
  if (actorId.startsWith('pet_')) {
    const petName = resolveEntityName(actorId, ctx);
    return {
      text: formatPetSkillUsed(petName, skillName),
      emitter: 'PLAYER',
      tone: 'skill',
    };
  }
  if (ctx.playerActorId && actorId === ctx.playerActorId) {
    return {
      text: formatPlayerSkillUsed(skillName),
      emitter: 'PLAYER',
      tone: 'skill',
    };
  }

  const actorName = resolveEntityName(actorId, ctx);
  return {
    text: formatEnemySkillUsed(actorName, skillName),
    emitter: 'ENEMY',
    tone: 'skill',
  };
}

function shouldHideLine(line: string): boolean {
  return HIDDEN_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function resolveEntityName(actorId: string, ctx: BattleNarratorContext): string {
  if (ctx.playerActorId && actorId === ctx.playerActorId) return 'Você';
  const combatant = ctx.combatants[actorId];
  if (combatant?.name) return combatant.name;
  return 'Inimigo';
}

function resolveStatusEventEmitter(
  targetId: string,
  ctx: BattleNarratorContext,
): BattleLogEmitter {
  if (ctx.playerActorId && targetId === ctx.playerActorId) return 'PLAYER';
  if (targetId.startsWith('pet_')) return 'PLAYER';
  const role = ctx.combatants[targetId]?.combatRole;
  if (role === 'ENEMY') return 'ENEMY';
  if (ctx.playerActorId && targetId !== ctx.playerActorId) return 'ENEMY';
  return 'SYSTEM';
}

function resolveSkillName(skillId: string, combatant?: Combatant): string {
  const fromCatalog = resolveMoveDefinitionForUi(skillId)?.name;
  if (fromCatalog) return fromCatalog;

  const fromCombatant = combatant?.skills.find((s) => s.id === skillId)?.name;
  if (fromCombatant) return fromCombatant;

  const override = SKILL_LABEL_OVERRIDES[skillId];
  if (override) return override;

  return humanizeSkillId(skillId);
}

function humanizeSkillId(skillId: string): string {
  return skillId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stripInternalIds(text: string): string {
  return text
    .replace(/\bplayer_[a-z0-9_-]+\b/gi, 'Você')
    .replace(/\b[a-z]+_[a-f0-9]{4,}\b/gi, 'Inimigo')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function resolveActorIdFromLabel(label: string, ctx: BattleNarratorContext): string | null {
  if (label === 'Você' && ctx.playerActorId) return ctx.playerActorId;

  for (const [id, combatant] of Object.entries(ctx.combatants)) {
    if (combatant.name === label) return id;
  }

  if (ctx.combatants[label]) return label;
  return null;
}

function findOpponentName(ctx: BattleNarratorContext, sourceId: string | null): string | null {
  for (const [id, combatant] of Object.entries(ctx.combatants)) {
    if (id !== sourceId && id !== ctx.playerActorId) return combatant.name;
  }
  if (ctx.playerActorId) {
    for (const [id, combatant] of Object.entries(ctx.combatants)) {
      if (id !== ctx.playerActorId) return combatant.name;
    }
  }
  return null;
}
