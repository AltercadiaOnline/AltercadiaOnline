import type { PlayerSkinBundleId } from '../character/playerSkinBundle.js';
import { isValidPlayerSkinBundleId } from '../character/playerSkinBundle.js';
import type { PetKindId } from '../pet/petCatalog.js';
import { isPetKindId } from '../pet/petCatalog.js';
import type { PetColorId } from '../pet/petColorPalette.js';
import { isPetColorId } from '../pet/petColorPalette.js';
import type { PetGenderId } from '../pet/petGender.js';
import { isPetGenderId } from '../pet/petGender.js';
import type { PlayerFacing } from './playerFacing.js';

/** Companheiro convocado do peer — só identidade visual; pose deriva do dono no cliente. */
export type RemotePlayerCompanionSnapshot = {
  readonly name: string;
  readonly kindId: PetKindId;
  readonly colorId: PetColorId;
  readonly gender: PetGenderId;
};

/** Snapshot autoritativo de outro jogador no mapa — campo `nearbyPlayers` no state-sync tick. */
export type RemotePlayerSnapshot = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName?: string;
  readonly skinBundleId?: PlayerSkinBundleId;
  readonly level?: number;
  readonly companion?: RemotePlayerCompanionSnapshot;
  readonly mapId: string;
  readonly feetX: number;
  readonly feetY: number;
  readonly facing: PlayerFacing;
  readonly serverTimeMs: number;
};

function parseOptionalDisplayName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalSkinBundleId(value: unknown): PlayerSkinBundleId | undefined {
  return typeof value === 'string' && isValidPlayerSkinBundleId(value) ? value : undefined;
}

function parseOptionalLevel(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const level = Math.floor(value);
  return level >= 1 ? level : undefined;
}

function parseOptionalCompanion(value: unknown): RemotePlayerCompanionSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.kindId !== 'string' || !isPetKindId(record.kindId)) return undefined;
  if (typeof record.colorId !== 'string' || !isPetColorId(record.colorId)) return undefined;
  if (typeof record.gender !== 'string' || !isPetGenderId(record.gender)) return undefined;
  if (typeof record.name !== 'string') return undefined;
  const name = record.name.trim();
  if (name.length === 0) return undefined;
  return {
    name,
    kindId: record.kindId,
    colorId: record.colorId,
    gender: record.gender,
  };
}

export function isValidRemotePlayerSnapshot(value: unknown): value is RemotePlayerSnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.playerId === 'string'
    && record.playerId.length > 0
    && typeof record.characterId === 'number'
    && Number.isFinite(record.characterId)
    && typeof record.mapId === 'string'
    && typeof record.feetX === 'number'
    && Number.isFinite(record.feetX)
    && typeof record.feetY === 'number'
    && Number.isFinite(record.feetY)
    && typeof record.facing === 'string'
    && typeof record.serverTimeMs === 'number'
    && Number.isFinite(record.serverTimeMs)
  );
}

export function normalizeRemotePlayerSnapshot(value: unknown): RemotePlayerSnapshot | null {
  if (!isValidRemotePlayerSnapshot(value)) return null;
  const record = value as Record<string, unknown>;
  const displayName = parseOptionalDisplayName(record.displayName);
  const skinBundleId = parseOptionalSkinBundleId(record.skinBundleId);
  const level = parseOptionalLevel(record.level);
  const companion = parseOptionalCompanion(record.companion);
  return {
    playerId: record.playerId as string,
    characterId: record.characterId as number,
    mapId: record.mapId as string,
    feetX: record.feetX as number,
    feetY: record.feetY as number,
    facing: record.facing as PlayerFacing,
    serverTimeMs: record.serverTimeMs as number,
    ...(displayName ? { displayName } : {}),
    ...(skinBundleId ? { skinBundleId } : {}),
    ...(level !== undefined ? { level } : {}),
    ...(companion ? { companion } : {}),
  };
}

export function parseRemotePlayerSnapshots(raw: unknown): RemotePlayerSnapshot[] | null {
  if (!Array.isArray(raw)) return null;
  const parsed: RemotePlayerSnapshot[] = [];
  for (const item of raw) {
    const snapshot = normalizeRemotePlayerSnapshot(item);
    if (!snapshot) return null;
    parsed.push(snapshot);
  }
  return parsed;
}
