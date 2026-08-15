/**
 * Tipos e dados para a mecânica de Spray Tático (Sinalização Assíncrona & Hub Social)
 */

export interface SprayStencilAsset {
  readonly id: string;
  readonly name: string;
  readonly rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  readonly iconUrl: string;
  readonly renderAssetUrl: string;
}

export const OFFICIAL_SPRAY_STENCILS: Record<string, SprayStencilAsset> = {
  spray_terminal_hackeado: {
    id: 'spray_terminal_hackeado',
    name: 'Terminal Hackeado',
    rarity: 'RARE',
    iconUrl: '/assets/items/assets_sprays/PIXOS_NO_CHÃO/asset_pixo_spray1/base/rotations/unknown.png',
    renderAssetUrl: '/assets/items/assets_sprays/PIXOS_NO_CHÃO/asset_pixo_spray1/base/rotations/unknown.png',
  },
  spray_alerta_binario: {
    id: 'spray_alerta_binario',
    name: 'Alerta Binário',
    rarity: 'COMMON',
    iconUrl: '/assets/items/assets_sprays/PIXOS_NO_CHÃO/asset_pixo_spray2/base/rotations/unknown.png',
    renderAssetUrl: '/assets/items/assets_sprays/PIXOS_NO_CHÃO/asset_pixo_spray2/base/rotations/unknown.png',
  },
  spray_vigilante: {
    id: 'spray_vigilante',
    name: 'Vigilante',
    rarity: 'EPIC',
    iconUrl: '/assets/items/assets_sprays/PIXOS_NO_CHÃO/asset_pixo_spray3/base/rotations/unknown.png',
    renderAssetUrl: '/assets/items/assets_sprays/PIXOS_NO_CHÃO/asset_pixo_spray3/base/rotations/unknown.png',
  },
};

export interface TacticalSpray {
  readonly id: string;
  readonly zoneId: string;
  readonly posX: number;
  readonly posY: number;
  readonly userId: string;
  readonly authorNickname: string;
  readonly sprayAssetId: string;
  readonly createdAt: number; // Timestamp MS
  readonly upvoteCount: number;
}

export interface SprayInteractionRecord {
  readonly sprayId: string;
  readonly interatorUserId: string;
  readonly interatorNickname: string;
  readonly interactionType: 'UPVOTE' | 'VIEW';
  readonly timestamp: number;
}

export interface SprayUsePayload {
  readonly userId: string;
  readonly zoneId: string;
  readonly posX: number;
  readonly posY: number;
  readonly sprayAssetId: string;
}

export interface SpraySocialFeedItem {
  readonly sprayId: string;
  readonly zoneId: string;
  readonly posX: number;
  readonly posY: number;
  readonly sprayAssetId: string;
  readonly totalUpvotes: number;
  readonly interactions: readonly SprayInteractionRecord[];
  readonly totalVoltsEarned: number;
  readonly totalZoneReputationEarned: number;
}
