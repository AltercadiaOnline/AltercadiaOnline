import { useSyncExternalStore } from 'react';
import {
  buildShareFillHeightPercent,
  computeBuildDistribution,
  extractCombatOnlyBuildWeightsFromItemIds,
  formatBuildShareBonusLabel,
  type BuildDistribution,
} from '../../../../../shared/character/buildDistribution.js';
import { getPlayerStatsGateway } from '../../../../gateway/PlayerStatsGateway.js';
import { getPlayerItemStore } from '../../../../ui/items/playerItemStore.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';

function readBuildDistribution(): BuildDistribution {
  const bonus = getPlayerStatsGateway().resolveSnapshot().statsBonus;
  const grid = getPlayerItemStore().toEquipmentGrid();
  const combatOnly = extractCombatOnlyBuildWeightsFromItemIds(Object.values(grid));
  return computeBuildDistribution(bonus, combatOnly);
}

function readBuildFingerprint(): string {
  const bonus = getPlayerStatsGateway().resolveSnapshot().statsBonus;
  const grid = getPlayerItemStore().toEquipmentGrid();
  return `${bonus.forca}|${bonus.defesa}|${bonus.critico}|${bonus.agilidade}|${Object.values(grid).join('|')}`;
}

function useBuildDistribution(): BuildDistribution {
  const fingerprint = useSyncExternalStore(
    (onChange) => {
      const unsubItems = subscribeExternalStore(
        (listener) => getPlayerItemStore().subscribe(() => listener()),
        onChange,
      );
      const unsubStats = uiEvents.on(UIEventType.PLAYER_STATS_UPDATED, () => {
        onChange();
      });
      return () => {
        unsubItems();
        unsubStats();
      };
    },
    readBuildFingerprint,
    () => '0|0|0|0',
  );

  void fingerprint;
  return readBuildDistribution();
}

/**
 * Distribuição visual da build (ATK/DEF/CRIT/AGIL) — display-only.
 * Passivos do SET + efeitos combatOnly da runa/livro (mesmo path local × online).
 */
export function WorldSidebarBuildDistribution() {
  const distribution = useBuildDistribution();

  return (
    <div
      className={`sidebar-build${distribution.hasSignal ? '' : ' sidebar-build--empty'}`}
      aria-label="Distribuição da build"
    >
      <p className="sidebar-segment__label">BUILD</p>
      <div className="sidebar-build__grid" role="list">
        {distribution.shares.map((share) => (
          <div
            key={share.id}
            className={`sidebar-build__slot${share.weight <= 0 ? ' sidebar-build__slot--zero' : ''}`}
            role="listitem"
            aria-label={`${share.label} ${formatBuildShareBonusLabel(share.weight)}`}
            title={
              distribution.hasSignal
                ? `${share.label}: ${formatBuildShareBonusLabel(share.weight)}`
                : `${share.label}: sem bônus de SET/runa`
            }
          >
            <span className="sidebar-build__label">{share.label}</span>
            <span className="sidebar-build__value">{formatBuildShareBonusLabel(share.weight)}</span>
            <span
              className="sidebar-build__fill"
              style={{ height: `${buildShareFillHeightPercent(share.weight)}%` }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
