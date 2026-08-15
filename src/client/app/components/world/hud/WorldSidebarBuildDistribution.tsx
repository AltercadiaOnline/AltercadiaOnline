import { useSyncExternalStore } from 'react';
import {
  computeBuildDistribution,
  type BuildDistribution,
} from '../../../../../shared/character/buildDistribution.js';
import { getPlayerStatsGateway } from '../../../../gateway/PlayerStatsGateway.js';
import { getPlayerItemStore } from '../../../../ui/items/playerItemStore.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';

function readStatsFingerprint(): string {
  const bonus = getPlayerStatsGateway().resolveSnapshot().statsBonus;
  return `${bonus.forca}|${bonus.defesa}|${bonus.critico}|${bonus.agilidade}`;
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
    readStatsFingerprint,
    () => '0|0|0|0',
  );

  void fingerprint;
  return computeBuildDistribution(getPlayerStatsGateway().resolveSnapshot().statsBonus);
}

/**
 * Distribuição visual da build (ATK/DEF/CRIT/AGIL) — display-only a partir do
 * espelho de SET (mesmo path local × online via PlayerStatsGateway).
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
            className={`sidebar-build__slot${share.percent <= 0 ? ' sidebar-build__slot--zero' : ''}`}
            role="listitem"
            aria-label={`${share.label} ${share.percent}%`}
            title={
              distribution.hasSignal
                ? `${share.label}: ${share.percent}% (peso ${share.weight})`
                : `${share.label}: sem bônus de SET`
            }
          >
            <span className="sidebar-build__label">{share.label}</span>
            <span className="sidebar-build__value">{`${share.percent}%`}</span>
            <span
              className="sidebar-build__fill"
              style={{ height: `${Math.max(share.percent, 0)}%` }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
