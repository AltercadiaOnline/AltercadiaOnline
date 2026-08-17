import { getAuthoritativeProgression, patchAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';

export function applyAuthoritativePveKillCredit(
  playerId: string,
  characterId: number,
  credit: {
    readonly kills: number;
    readonly bossKills: number;
    readonly dungeonClears?: number;
  },
): void {
  const kills = Math.max(0, Math.floor(credit.kills));
  const bossKills = Math.max(0, Math.floor(credit.bossKills));
  const dungeonClears = Math.max(0, Math.floor(credit.dungeonClears ?? 0));
  if (kills <= 0 && bossKills <= 0 && dungeonClears <= 0) return;

  const profile = getAuthoritativeProgression(playerId, characterId).characterProfile;
  patchAuthoritativeProgression(playerId, characterId, {
    characterProfile: {
      pveKills: Math.max(0, Math.floor(profile.pveKills ?? 0)) + kills,
      pveBossKills: Math.max(0, Math.floor(profile.pveBossKills ?? 0)) + bossKills,
      pveDungeonClears: Math.max(0, Math.floor(profile.pveDungeonClears ?? 0)) + dungeonClears,
    },
  });
}
