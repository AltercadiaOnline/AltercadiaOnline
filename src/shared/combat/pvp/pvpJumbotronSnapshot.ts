/**
 * Telão PvP ranqueado — snapshot público só leitura para quem explora city_01.
 * Cliente não calcula HP nem monta o log; só desenha o que o servidor mandou.
 */

import {
  DEFAULT_PLAYER_SKIN_BUNDLE_ID,
  isValidPlayerSkinBundleId,
  type PlayerSkinBundleId,
} from '../../character/playerSkinBundle.js';
import { CombatEventType, type CombatEvent } from '../../events.js';
import { resolveCombatantHp } from '../../pet/petCombatRules.js';
import type { Combatant, CombatState } from '../../types.js';

export const PVP_JUMBOTRON_IDLE_LABEL = 'Aguardando luta';
export const PVP_JUMBOTRON_LAST_LOG_MAX_CHARS = 48;

export type PvpJumbotronPhase = 'idle' | 'in_battle';

export type PvpJumbotronFighter = {
  readonly displayName: string;
  readonly skinBundleId: PlayerSkinBundleId;
  readonly hp: number;
  readonly maxHp: number;
};

export type PvpJumbotronSnapshot = {
  readonly phase: PvpJumbotronPhase;
  readonly sides: readonly [PvpJumbotronFighter | null, PvpJumbotronFighter | null];
  readonly lastLogLine: string;
};

export function createIdlePvpJumbotronSnapshot(): PvpJumbotronSnapshot {
  return {
    phase: 'idle',
    sides: [null, null],
    lastLogLine: '',
  };
}

export function pvpJumbotronSignature(snapshot: PvpJumbotronSnapshot): string {
  const [left, right] = snapshot.sides;
  return [
    snapshot.phase,
    snapshot.lastLogLine,
    fighterSig(left),
    fighterSig(right),
  ].join('|');
}

function fighterSig(side: PvpJumbotronFighter | null): string {
  if (!side) return '-';
  return `${side.displayName}:${side.skinBundleId}:${side.hp}/${side.maxHp}`;
}

function isPvpJumbotronFighter(value: unknown): value is PvpJumbotronFighter {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  if (typeof r.displayName !== 'string') return false;
  if (typeof r.skinBundleId !== 'string' || !isValidPlayerSkinBundleId(r.skinBundleId)) return false;
  if (typeof r.hp !== 'number' || !Number.isFinite(r.hp)) return false;
  if (typeof r.maxHp !== 'number' || !Number.isFinite(r.maxHp)) return false;
  return true;
}

export function isPvpJumbotronSnapshot(value: unknown): value is PvpJumbotronSnapshot {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  if (r.phase !== 'idle' && r.phase !== 'in_battle') return false;
  if (typeof r.lastLogLine !== 'string') return false;
  if (!Array.isArray(r.sides) || r.sides.length !== 2) return false;
  const left = r.sides[0];
  const right = r.sides[1];
  if (!(left === null || isPvpJumbotronFighter(left))) return false;
  if (!(right === null || isPvpJumbotronFighter(right))) return false;
  return true;
}

export function parsePvpJumbotronSnapshot(value: unknown): PvpJumbotronSnapshot | null {
  return isPvpJumbotronSnapshot(value) ? value : null;
}

function clipLogLine(line: string): string {
  const trimmed = line.trim();
  if (trimmed.length <= PVP_JUMBOTRON_LAST_LOG_MAX_CHARS) return trimmed;
  return `${trimmed.slice(0, PVP_JUMBOTRON_LAST_LOG_MAX_CHARS - 1)}…`;
}

function combatantDisplayName(
  combatants: Readonly<Record<string, Combatant>>,
  actorId: string,
): string {
  const name = combatants[actorId]?.name?.trim();
  return name && name.length > 0 ? name : '???';
}

/** Linha em terceira pessoa a partir dos eventos do turno. Sem cálculo de dano. */
export function resolvePvpJumbotronLastLogLine(
  events: readonly CombatEvent[],
  combatants: Readonly<Record<string, Combatant>>,
  previous: string,
): string {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (!event) continue;
    if (event.type === CombatEventType.DAMAGE_DEALT) {
      const source = combatantDisplayName(combatants, event.payload.sourceId);
      const skill = event.payload.skillName?.trim() || 'golpe';
      const amount = Math.max(0, Math.floor(event.payload.amount));
      const crit = event.payload.isCritical ? '!' : '';
      return clipLogLine(`${source} usou ${skill} → ${amount}${crit}`);
    }
    if (event.type === CombatEventType.HEAL_APPLIED) {
      const actor = combatantDisplayName(combatants, event.payload.actorId);
      const amount = Math.max(0, Math.floor(event.payload.amount));
      return clipLogLine(`${actor} curou +${amount}`);
    }
  }
  return previous;
}

function toJumbotronFighter(combatant: Combatant | undefined): PvpJumbotronFighter | null {
  if (!combatant) return null;
  const maxHp = Math.max(1, Math.floor(combatant.hpMax ?? combatant.maxHp ?? 1));
  const hp = Math.max(0, Math.min(maxHp, Math.floor(resolveCombatantHp(combatant))));
  const name = combatant.name?.trim();
  const raw = combatant.skinBundleId;
  return {
    displayName: name && name.length > 0 ? name : '???',
    skinBundleId: raw && isValidPlayerSkinBundleId(raw) ? raw : DEFAULT_PLAYER_SKIN_BUNDLE_ID,
    hp,
    maxHp,
  };
}

export function buildPvpJumbotronSnapshot(input: {
  readonly state: CombatState;
  readonly actorAId: string;
  readonly actorBId: string;
  readonly lastLogLine: string;
}): PvpJumbotronSnapshot {
  if (input.state.phase === 'ENDED') {
    return createIdlePvpJumbotronSnapshot();
  }
  const left = toJumbotronFighter(input.state.combatants[input.actorAId]);
  const right = toJumbotronFighter(input.state.combatants[input.actorBId]);
  if (!left || !right) {
    return createIdlePvpJumbotronSnapshot();
  }
  return {
    phase: 'in_battle',
    sides: [left, right],
    lastLogLine: clipLogLine(input.lastLogLine),
  };
}
