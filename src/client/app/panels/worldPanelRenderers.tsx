import { Suspense, lazy, type ReactNode } from 'react';
import type { OpenWorldPanelEntry } from '../store/worldPanelContext.js';
import { tryFocusReactWorldPanel } from './initWorldPanelsBridge.js';
import type { UiWindowId } from '../../ui/uiEvents.js';
import { HudErrorBoundary } from '../components/HudErrorBoundary.js';
import { WorldDialoguePanel } from '../components/world/panels/WorldDialoguePanel.js';
import { WorldDiaryPanel } from '../components/world/panels/WorldDiaryPanel.js';
import { WorldLaboratoryShopPanel } from '../components/world/panels/WorldLaboratoryShopPanel.js';
import { WorldPetMemorialPanel } from '../components/world/panels/WorldPetMemorialPanel.js';
import { WorldPetTrainerShopPanel } from '../components/world/panels/WorldPetTrainerShopPanel.js';
import { WorldQuestPanel } from '../components/world/panels/WorldQuestPanel.js';
import { WorldRankingMonitorPanel } from '../components/world/panels/WorldRankingMonitorPanel.js';
import { WorldPvpQueuePanel } from '../components/world/panels/WorldPvpQueuePanel.js';
import { WorldRefractionBoothPanel } from '../components/world/panels/WorldRefractionBoothPanel.js';
import { WorldShopPanel } from '../components/world/panels/WorldShopPanel.js';
import { WorldSocialPanel } from '../components/world/panels/WorldSocialPanel.js';
import { WorldTournamentBetPanel } from '../components/world/panels/WorldTournamentBetPanel.js';
import { WorldPetLovePanel } from '../components/world/panels/WorldPetLovePanel.js';

const LazyWorldInventoryPanel = lazy(async () => {
  const module = await import('../components/world/panels/WorldInventoryPanel.js');
  return { default: module.WorldInventoryPanel };
});

const LazyWorldCraftPanel = lazy(async () => {
  const module = await import('../components/world/panels/WorldCraftPanel.js');
  return { default: module.WorldCraftPanel };
});

const LazyWorldVendorShopPanel = lazy(async () => {
  const module = await import('../components/world/panels/WorldVendorShopPanel.js');
  return { default: module.WorldVendorShopPanel };
});

const LazyWorldMarketPanel = lazy(async () => {
  const module = await import('../components/world/panels/WorldMarketPanel.js');
  return { default: module.WorldMarketPanel };
});

const LazyWorldMarketHubPanel = lazy(async () => {
  const module = await import('../components/world/panels/WorldMarketHubPanel.js');
  return { default: module.WorldMarketHubPanel };
});

const LazyWorldBankPanel = lazy(async () => {
  const module = await import('../components/world/panels/WorldBankPanel.js');
  return { default: module.WorldBankPanel };
});

const LazyWorldCharactersPanel = lazy(async () => {
  const module = await import('../components/world/panels/WorldCharactersPanel.js');
  return { default: module.WorldCharactersPanel };
});

const LazyWorldMovesetPanel = lazy(async () => {
  const module = await import('../components/world/panels/WorldMovesetPanel.js');
  return { default: module.WorldMovesetPanel };
});

const LazyWorldMarcosPanel = lazy(async () => {
  const module = await import('../components/world/panels/WorldMarcosPanel.js');
  return { default: module.WorldMarcosPanel };
});

export type WorldPanelRenderProps = {
  readonly entry: OpenWorldPanelEntry;
  readonly focused: boolean;
};

export type WorldPanelRenderer = (props: WorldPanelRenderProps) => ReactNode;

function withSuspense(renderer: WorldPanelRenderer): WorldPanelRenderer {
  return (props) => (
    <Suspense fallback={null}>
      {renderer(props)}
    </Suspense>
  );
}

function resolvePanelKey(entry: OpenWorldPanelEntry): string {
  const { windowId, context } = entry;

  switch (windowId) {
    case 'craft':
      return `craft-${context.kind === 'craftStation' ? context.craftStationId : 'default'}`;
    case 'vendorShop':
      return `vendor-${context.kind === 'vendorShop' ? context.vendorId : 'default'}`;
    case 'laboratoryShop':
      return `lab-${context.kind === 'laboratoryShop' ? context.vendorId : 'default'}`;
    case 'petTrainerShop':
      return `pet-${context.kind === 'petTrainerShop' ? context.vendorId : 'default'}`;
    case 'tournamentBet':
      return `tournament-${context.kind === 'tournamentBet' ? context.pulpitId : 'default'}`;
    case 'rankingMonitor':
      return `ranking-${context.kind === 'rankingMonitor' ? context.objectId : 'default'}`;
    case 'pvpQueue':
      return `pvp-queue-${context.kind === 'pvpQueue' ? context.objectId : 'default'}`;
    case 'refractionBooth':
      return `refraction-${context.kind === 'refractionBooth' ? context.objectId : 'default'}`;
    default:
      return windowId;
  }
}

function renderDialoguePanel({ entry, focused }: WorldPanelRenderProps): ReactNode {
  if (entry.context.kind !== 'dialogue') return null;

  return (
    <WorldDialoguePanel
      key={entry.windowId}
      context={entry.context}
      zIndex={entry.zIndex}
      focused={focused}
      onFocus={() => tryFocusReactWorldPanel('dialogue')}
    />
  );
}

/** Mapa canônico windowId → componente React (exploração). */
export const WORLD_PANEL_RENDERERS: Partial<Record<UiWindowId, WorldPanelRenderer>> = {
  inventory: withSuspense(({ entry, focused }) => (
    <LazyWorldInventoryPanel
      key={resolvePanelKey(entry)}
      zIndex={entry.zIndex}
      focused={focused}
    />
  )),
  craft: withSuspense(({ entry, focused }) => (
    <LazyWorldCraftPanel
      key={resolvePanelKey(entry)}
      context={entry.context}
      zIndex={entry.zIndex}
      focused={focused}
    />
  )),
  dialogue: renderDialoguePanel,
  vendorShop: withSuspense(({ entry, focused }) => (
    <LazyWorldVendorShopPanel
      key={resolvePanelKey(entry)}
      context={entry.context}
      zIndex={entry.zIndex}
      focused={focused}
    />
  )),
  laboratoryShop: ({ entry, focused }) => (
    <WorldLaboratoryShopPanel
      key={resolvePanelKey(entry)}
      context={entry.context}
      zIndex={entry.zIndex}
      focused={focused}
    />
  ),
  petTrainerShop: ({ entry, focused }) => (
    <WorldPetTrainerShopPanel
      key={resolvePanelKey(entry)}
      context={entry.context}
      zIndex={entry.zIndex}
      focused={focused}
    />
  ),
  tournamentBet: ({ entry, focused }) => (
    <WorldTournamentBetPanel
      key={resolvePanelKey(entry)}
      context={entry.context}
      zIndex={entry.zIndex}
      focused={focused}
    />
  ),
  rankingMonitor: ({ entry, focused }) => (
    <WorldRankingMonitorPanel
      key={resolvePanelKey(entry)}
      context={entry.context}
      zIndex={entry.zIndex}
      focused={focused}
    />
  ),
  pvpQueue: ({ entry, focused }) => (
    <HudErrorBoundary
      key={resolvePanelKey(entry)}
      fallback={(
        <div className="pvp-queue pvp-queue--error" style={{ padding: '0.75rem', color: '#ecdcc4' }}>
          Falha ao abrir PvP Rankeado. Feche e tente de novo.
        </div>
      )}
    >
      <WorldPvpQueuePanel
        context={entry.context}
        zIndex={entry.zIndex}
        focused={focused}
      />
    </HudErrorBoundary>
  ),
  refractionBooth: ({ entry, focused }) => (
    <WorldRefractionBoothPanel
      key={resolvePanelKey(entry)}
      context={entry.context}
      zIndex={entry.zIndex}
      focused={focused}
    />
  ),
  quest: ({ entry, focused }) => (
    <WorldQuestPanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
  ),
  social: ({ entry, focused }) => (
    <WorldSocialPanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
  ),
  shop: ({ entry, focused }) => (
    <WorldShopPanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
  ),
  marketHub: withSuspense(({ entry, focused }) => (
    <LazyWorldMarketHubPanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
  )),
  diary: ({ entry, focused }) => (
    <WorldDiaryPanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
  ),
  petMemorial: ({ entry, focused }) => (
    <WorldPetMemorialPanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
  ),
  moveset: withSuspense(({ entry, focused }) => (
    <LazyWorldMovesetPanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
  )),
  marcos: withSuspense(({ entry, focused }) => (
    <LazyWorldMarcosPanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
  )),
  market: withSuspense(({ entry, focused }) => (
    <LazyWorldMarketPanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
  )),
  characters: withSuspense(({ entry, focused }) => (
    <HudErrorBoundary
      key={entry.windowId}
      fallback={(
        <div
          className="p-3 text-[10px] text-[#ecdcc4]"
        >
          Falha ao abrir a Ficha. Feche e tente de novo.
        </div>
      )}
    >
      <LazyWorldCharactersPanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
    </HudErrorBoundary>
  )),
  bank: withSuspense(({ entry, focused }) => (
    <LazyWorldBankPanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
  )),
  petLove: ({ entry, focused }) => (
    <WorldPetLovePanel key={entry.windowId} zIndex={entry.zIndex} focused={focused} />
  ),
};

export function hasDedicatedWorldPanelRenderer(windowId: UiWindowId): boolean {
  return Boolean(WORLD_PANEL_RENDERERS[windowId]);
}

export function renderDedicatedWorldPanel(props: WorldPanelRenderProps): ReactNode {
  const renderer = WORLD_PANEL_RENDERERS[props.entry.windowId];
  if (!renderer) return null;
  return renderer(props);
}

export { resolvePanelKey };
