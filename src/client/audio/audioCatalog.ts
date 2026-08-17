/**
 * Catálogo de trilhas — a UI só conhece IDs, nunca paths.
 * Novas zonas: acrescentar id aqui; o AudioManager reusa o mesmo elemento de BGM.
 */
export type BgmTrackId = 'login';

export const MENU_BGM_TRACK_ID: BgmTrackId = 'login';

const BGM_URLS: Record<BgmTrackId, readonly string[]> = {
  login: ['/assets/audio/bgm/login.ogg', '/assets/audio/bgm/login.mp3'],
};

export function resolveBgmUrls(trackId: BgmTrackId): readonly string[] {
  return BGM_URLS[trackId];
}

export function clampAudioVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function isMenuBgmScreen(screenId: string): boolean {
  return screenId === 'login-screen' || screenId === 'char-select-screen';
}

export function shouldPlayMenuBgm(screenId: string, worldEnterLocked: boolean): boolean {
  return !worldEnterLocked && isMenuBgmScreen(screenId);
}
