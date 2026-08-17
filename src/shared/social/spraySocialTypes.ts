import { OFFICIAL_SPRAY_STENCILS } from '../types/tacticalSpray.js';

export const SPRAY_LEGACY_MESSAGE_MAX_CHARS = 120;

export const SPRAY_PLACE_TOO_CLOSE_CODE = 'SPRAY_TOO_CLOSE' as const;
export const SPRAY_NOT_FOUND_CODE = 'SPRAY_NOT_FOUND' as const;
export const SPRAY_NOT_AUTHOR_CODE = 'NOT_SPRAY_AUTHOR' as const;

export function isOfficialSprayItemId(itemId: string): boolean {
  return Object.prototype.hasOwnProperty.call(OFFICIAL_SPRAY_STENCILS, itemId);
}

export function sanitizeSprayLegacyMessage(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, SPRAY_LEGACY_MESSAGE_MAX_CHARS);
}

/** Snapshot de zona — espelho de render, sem dados sociais ao vivo. */
export type WorldSpraySnapshot = {
  readonly id: string;
  readonly mapId: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly sprayAssetId: string;
  readonly authorPlayerId: string;
  readonly authorCharacterId: number;
  readonly upvoteCount: number;
};

export type SprayInspectAuthorView = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly level: number;
  readonly online: boolean;
  readonly legacyMessage: string;
};

export type SprayInspectView = {
  readonly sprayId: string;
  readonly mapId: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly sprayAssetId: string;
  readonly author: SprayInspectAuthorView;
  readonly canEditLegacy: boolean;
  readonly canAddFriend: boolean;
};

export function isWorldSpraySnapshot(value: unknown): value is WorldSpraySnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.mapId === 'string'
    && typeof record.tileX === 'number'
    && typeof record.tileY === 'number'
    && typeof record.sprayAssetId === 'string'
    && typeof record.authorPlayerId === 'string'
    && typeof record.authorCharacterId === 'number'
    && typeof record.upvoteCount === 'number';
}

export function parseWorldSpraySnapshots(raw: unknown): WorldSpraySnapshot[] | null {
  if (!Array.isArray(raw)) return null;
  const parsed: WorldSpraySnapshot[] = [];
  for (const item of raw) {
    if (!isWorldSpraySnapshot(item)) return null;
    parsed.push(item);
  }
  return parsed;
}

export function isSprayInspectView(value: unknown): value is SprayInspectView {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const author = record.author;
  if (!author || typeof author !== 'object') return false;
  const a = author as Record<string, unknown>;
  return typeof record.sprayId === 'string'
    && typeof record.mapId === 'string'
    && typeof record.tileX === 'number'
    && typeof record.tileY === 'number'
    && typeof record.sprayAssetId === 'string'
    && typeof a.playerId === 'string'
    && typeof a.characterId === 'number'
    && typeof a.displayName === 'string'
    && typeof a.level === 'number'
    && typeof a.online === 'boolean'
    && typeof a.legacyMessage === 'string'
    && typeof record.canEditLegacy === 'boolean'
    && typeof record.canAddFriend === 'boolean';
}
