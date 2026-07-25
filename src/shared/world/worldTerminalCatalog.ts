/**
 * Terminais de domínio — markers Construct + IDs no registry.
 *
 * Padrão: um computador por hub de mecânica (não misturar).
 * Sprite/overlay do personagem fica fora; no Construct só o prop/marker.
 */

export const WORLD_TERMINAL_IDS = {
  /** Ranking PvP da cidade (hub). */
  ARENA: 'computador_arena',
  /** Púlpito de fila PvP ranqueada (2 slots → batalha). Marker Construct: `combate_pvp`. */
  COMBATE_PVP: 'combate_pvp',
  /** Domínio / HUD da zona 1 (mecânicas de zona — futuro). */
  ZONE_1: 'computador_zona1',
  /** Domínio / HUD da zona 2 (futuro). */
  ZONE_2: 'computador_zona2',
  /** Marketplace P2P (lógica que hoje está no mercado/trocas). */
  MARKETPLACE: 'computador_marketplace',
} as const;

export type WorldTerminalId = (typeof WORLD_TERMINAL_IDS)[keyof typeof WORLD_TERMINAL_IDS];

export type WorldTerminalRole =
  | 'pvp_hub'
  | 'pvp_queue'
  | 'zone_domain'
  | 'marketplace_p2p';

export type WorldTerminalDefinition = {
  readonly id: WorldTerminalId;
  readonly label: string;
  readonly role: WorldTerminalRole;
  /** Marker sugerido no Construct (igual ao id). */
  readonly constructMarker: string;
  readonly status: 'active' | 'planned';
  readonly notes: string;
};

export const WORLD_TERMINAL_CATALOG: readonly WorldTerminalDefinition[] = [
  {
    id: WORLD_TERMINAL_IDS.ARENA,
    label: 'Computador da Arena',
    role: 'pvp_hub',
    constructMarker: WORLD_TERMINAL_IDS.ARENA,
    status: 'active',
    notes: 'Ranking PvP e hub da central. Fila de combate fica em combate_pvp.',
  },
  {
    id: WORLD_TERMINAL_IDS.COMBATE_PVP,
    label: 'PvP Rankeado',
    role: 'pvp_queue',
    constructMarker: WORLD_TERMINAL_IDS.COMBATE_PVP,
    status: 'active',
    notes: 'Púlpito (pulpito.pvp.png): HUD React 1x1 — dois slots, aceite mútuo, countdown 30s → batalha rankeada.',
  },
  {
    id: WORLD_TERMINAL_IDS.ZONE_1,
    label: 'Computador Zona 1',
    role: 'zone_domain',
    constructMarker: WORLD_TERMINAL_IDS.ZONE_1,
    status: 'planned',
    notes: 'HUD e mecânicas de domínio da zona 1.',
  },
  {
    id: WORLD_TERMINAL_IDS.ZONE_2,
    label: 'Computador Zona 2',
    role: 'zone_domain',
    constructMarker: WORLD_TERMINAL_IDS.ZONE_2,
    status: 'planned',
    notes: 'Mesmo padrão de domínio para a zona 2.',
  },
  {
    id: WORLD_TERMINAL_IDS.MARKETPLACE,
    label: 'Computador Marketplace',
    role: 'marketplace_p2p',
    constructMarker: WORLD_TERMINAL_IDS.MARKETPLACE,
    status: 'active',
    notes: 'Toda a lógica P2P de venda/troca (ex-terminal_mercado).',
  },
] as const;

export function getWorldTerminalDefinition(id: string): WorldTerminalDefinition | null {
  return WORLD_TERMINAL_CATALOG.find((entry) => entry.id === id) ?? null;
}

export function isWorldTerminalId(id: string): id is WorldTerminalId {
  return WORLD_TERMINAL_CATALOG.some((entry) => entry.id === id);
}
