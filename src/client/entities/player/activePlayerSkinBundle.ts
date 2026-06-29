import {
  DEFAULT_PLAYER_SKIN_BUNDLE_ID,
  type PlayerSkinBundleId,
} from '../../../shared/character/playerSkinBundle.js';

let activeBundleId: PlayerSkinBundleId = DEFAULT_PLAYER_SKIN_BUNDLE_ID;

export function getActivePlayerSkinBundleId(): PlayerSkinBundleId {
  return activeBundleId;
}

export function setActivePlayerSkinBundleId(bundleId: PlayerSkinBundleId): void {
  activeBundleId = bundleId;
}

export function resetActivePlayerSkinBundleId(): void {
  activeBundleId = DEFAULT_PLAYER_SKIN_BUNDLE_ID;
}
