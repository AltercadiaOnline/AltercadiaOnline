import type { EquipmentUiGridState } from '../../shared/character/equipmentUiSlots.js';
import {
  applyInheritanceStatsBonusPercent,
  resolvePetInheritanceBonusesFromStacks,
} from '../../shared/pet/petInheritanceBonuses.js';
import {
  calculateStatsBonusFromEquipment,
  computeSpeedBonusTotal,
  type PlayerStatsBonus,
} from '../../shared/character/playerStatsBonus.js';
import type { PlayerTotalStats } from '../../shared/items/itemUtils.js';
import { eventBus, HudEvent } from '../../shared/utils/EventBus.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';

export type PlayerStatsSource = 'local' | 'server';

export type PlayerStatsSnapshot = {
  readonly totalStats: PlayerTotalStats;
  readonly statsBonus: PlayerStatsBonus;
  readonly speedBonusTotal: number;
  readonly equipmentRevision: number;
  readonly source: PlayerStatsSource;
};

function bonusToTotalStats(bonus: PlayerStatsBonus): PlayerTotalStats {
  return {
    defesa: bonus.defesa,
    vida: bonus.vida,
    agilidade: bonus.agilidade,
    critico: bonus.critico,
    forca: bonus.forca,
  };
}

function computeSnapshotFromGrid(
  grid: EquipmentUiGridState,
  source: PlayerStatsSource,
  equipmentRevision: number,
): PlayerStatsSnapshot {
  const baseBonus = calculateStatsBonusFromEquipment(grid);
  const inheritance = resolvePetInheritanceBonusesFromStacks(getPlayerItemStore().toInventoryStacks());
  const statsBonus = applyInheritanceStatsBonusPercent(baseBonus, inheritance.statsBonusPercent);
  const speedBonusTotal = computeSpeedBonusTotal(statsBonus.agilidade, 0);

  return {
    totalStats: bonusToTotalStats(statsBonus),
    statsBonus,
    speedBonusTotal,
    equipmentRevision,
    source,
  };
}

/**
 * Gateway de stats do operativo — cache + invalidação.
 * Zero Trust: stats derivados do item store (espelho do snapshot do servidor), sem fetch Supabase.
 */
class PlayerStatsGateway {
  private cache: PlayerStatsSnapshot | null = null;
  private itemStoreUnsub: (() => void) | null = null;
  private attached = false;

  attach(): void {
    if (this.attached) return;
    this.attached = true;

    this.itemStoreUnsub = getPlayerItemStore().subscribe(() => {
      this.refreshFromLocalEquipment();
    });
  }

  detach(): void {
    this.itemStoreUnsub?.();
    this.itemStoreUnsub = null;
    this.attached = false;
    this.invalidateCache();
  }

  invalidateCache(): void {
    this.cache = null;
  }

  getCachedSnapshot(): PlayerStatsSnapshot | null {
    return this.cache;
  }

  /** Retorna snapshot atual — recalcula do item store se o cache foi invalidado. */
  resolveSnapshot(): PlayerStatsSnapshot {
    if (this.cache) return this.cache;
    return this.refreshFromLocalEquipment();
  }

  /** Stats imediatas a partir do SET local (mutação otimista / snapshot servidor). */
  refreshFromLocalEquipment(): PlayerStatsSnapshot {
    const itemSnap = getPlayerItemStore().getSnapshot();
    const snapshot = computeSnapshotFromGrid(
      getPlayerItemStore().toEquipmentGrid(),
      'local',
      itemSnap.revision,
    );
    this.commitSnapshot(snapshot);
    return snapshot;
  }

  /** Stats autoritativos após payload do servidor. */
  refreshFromAuthoritativeGrid(grid: EquipmentUiGridState): PlayerStatsSnapshot {
    this.invalidateCache();
    const itemSnap = getPlayerItemStore().getSnapshot();
    const snapshot = computeSnapshotFromGrid(grid, 'server', itemSnap.revision);
    this.commitSnapshot(snapshot);
    return snapshot;
  }

  /** @deprecated Zero Trust — cliente não consulta Supabase; use refreshFromLocalEquipment. */
  invalidateAndRefreshFromSupabase(_characterId: number): Promise<PlayerStatsSnapshot> {
    return Promise.resolve(this.refreshFromLocalEquipment());
  }

  private commitSnapshot(snapshot: PlayerStatsSnapshot): void {
    if (
      this.cache
      && this.cache.equipmentRevision === snapshot.equipmentRevision
      && this.cache.source === snapshot.source
      && this.cache.speedBonusTotal === snapshot.speedBonusTotal
      && this.cache.statsBonus.forca === snapshot.statsBonus.forca
      && this.cache.statsBonus.defesa === snapshot.statsBonus.defesa
      && this.cache.statsBonus.agilidade === snapshot.statsBonus.agilidade
    ) {
      return;
    }

    this.cache = snapshot;
    const level = getPlayerEquipmentStore().getSnapshot().level;
    eventBus.publish(HudEvent.PLAYER_STATS_UPDATED, {
      statsBonus: { ...snapshot.statsBonus },
      speedBonusTotal: snapshot.speedBonusTotal,
      level,
    });
  }
}

let activeGateway: PlayerStatsGateway | null = null;

export function getPlayerStatsGateway(): PlayerStatsGateway {
  if (!activeGateway) activeGateway = new PlayerStatsGateway();
  return activeGateway;
}

export function initPlayerStatsGateway(): PlayerStatsGateway {
  const gateway = getPlayerStatsGateway();
  gateway.attach();
  gateway.refreshFromLocalEquipment();
  return gateway;
}

export function resetPlayerStatsGateway(): void {
  activeGateway?.detach();
  activeGateway = null;
}
