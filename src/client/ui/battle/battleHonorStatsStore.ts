import { CombatEventType, type CombatEvent } from '../../../shared/events.js';
import type { PlayerHonorMainHit } from '../../../shared/combat/playerHonorTypes.js';
import type { Combatant } from '../../../shared/types.js';

type SkillAgg = {
  skillId: string;
  skillName: string;
  hitCount: number;
  totalDamage: number;
};

class BattleHonorStatsStore {
  private readonly damageDealtByActor = new Map<string, number>();
  private readonly skillsByActor = new Map<string, Map<string, SkillAgg>>();
  private readonly lastSkillByActor = new Map<string, string>();
  private readonly skillNames = new Map<string, string>();

  reset(): void {
    this.damageDealtByActor.clear();
    this.skillsByActor.clear();
    this.lastSkillByActor.clear();
    this.skillNames.clear();
  }

  syncCombatants(combatants: Readonly<Record<string, Combatant>>): void {
    for (const combatant of Object.values(combatants)) {
      for (const skill of combatant.skills ?? []) {
        this.skillNames.set(skill.id, skill.name);
      }
    }
  }

  recordEvents(events: readonly CombatEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case CombatEventType.ACTION_ACCEPTED: {
          const { actorId, skillId } = event.payload;
          if (!skillId) break;
          this.lastSkillByActor.set(actorId, skillId);
          this.bumpSkillUse(actorId, skillId);
          break;
        }
        case CombatEventType.DAMAGE_DEALT: {
          const { sourceId, amount } = event.payload;
          if (amount <= 0) break;
          this.damageDealtByActor.set(
            sourceId,
            (this.damageDealtByActor.get(sourceId) ?? 0) + amount,
          );
          const skillId = this.lastSkillByActor.get(sourceId);
          if (skillId) this.addSkillDamage(sourceId, skillId, amount);
          break;
        }
        default:
          break;
      }
    }
  }

  getDamageDealt(actorId: string): number {
    return this.damageDealtByActor.get(actorId) ?? 0;
  }

  getMainHits(actorId: string, limit = 3): readonly PlayerHonorMainHit[] {
    const bucket = this.skillsByActor.get(actorId);
    if (!bucket) return [];

    return [...bucket.values()]
      .sort((a, b) => b.hitCount - a.hitCount || b.totalDamage - a.totalDamage)
      .slice(0, limit)
      .map((entry) => ({
        skillName: entry.skillName,
        hitCount: entry.hitCount,
        totalDamage: entry.totalDamage,
      }));
  }

  private resolveSkillName(skillId: string): string {
    return this.skillNames.get(skillId) ?? skillId;
  }

  private getActorBucket(actorId: string): Map<string, SkillAgg> {
    const existing = this.skillsByActor.get(actorId);
    if (existing) return existing;
    const created = new Map<string, SkillAgg>();
    this.skillsByActor.set(actorId, created);
    return created;
  }

  private bumpSkillUse(actorId: string, skillId: string): void {
    const bucket = this.getActorBucket(actorId);
    const existing = bucket.get(skillId);
    bucket.set(skillId, {
      skillId,
      skillName: this.resolveSkillName(skillId),
      hitCount: (existing?.hitCount ?? 0) + 1,
      totalDamage: existing?.totalDamage ?? 0,
    });
  }

  private addSkillDamage(actorId: string, skillId: string, damage: number): void {
    const bucket = this.getActorBucket(actorId);
    const existing = bucket.get(skillId);
    bucket.set(skillId, {
      skillId,
      skillName: this.resolveSkillName(skillId),
      hitCount: existing?.hitCount ?? 1,
      totalDamage: (existing?.totalDamage ?? 0) + damage,
    });
  }
}

let store: BattleHonorStatsStore | null = null;

function ensureStore(): BattleHonorStatsStore {
  store ??= new BattleHonorStatsStore();
  return store;
}

export function resetBattleHonorStatsStore(): void {
  ensureStore().reset();
}

export function ingestBattleHonorStats(
  combatants: Readonly<Record<string, Combatant>>,
  events: readonly CombatEvent[],
): void {
  const bucket = ensureStore();
  bucket.syncCombatants(combatants);
  bucket.recordEvents(events);
}

export function readBattleHonorStats(actorId: string): {
  readonly damageDealt: number;
  readonly mainHits: readonly PlayerHonorMainHit[];
} {
  const bucket = ensureStore();
  return {
    damageDealt: bucket.getDamageDealt(actorId),
    mainHits: bucket.getMainHits(actorId),
  };
}
