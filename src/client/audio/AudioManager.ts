import {
  clampAudioVolume,
  MENU_BGM_TRACK_ID,
  resolveBgmUrls,
  shouldPlayMenuBgm,
  type BgmTrackId,
} from './audioCatalog.js';

const DEFAULT_BGM_VOLUME = 0.32;

/**
 * Único dono do canal de BGM no cliente.
 * Uma instância de HTMLAudioElement — sem new Audio() por tela.
 * SFX de combate continua nos elementos DOM existentes até um bus dedicado.
 */
class AudioManager {
  private element: HTMLAudioElement | null = null;
  private desiredTrack: BgmTrackId | null = null;
  private sourceIndex = 0;
  private playGeneration = 0;
  private volume = DEFAULT_BGM_VOLUME;
  private worldEnterLocked = false;
  private pausedByVisibility = false;
  private unlockBound = false;
  private visibilityBound = false;
  private missingWarned = false;
  private sourcesExhausted = false;

  playBGM(trackId: BgmTrackId): void {
    if (this.worldEnterLocked) return;
    this.ensureRuntime();
    if (this.desiredTrack === trackId) {
      if (this.isElementPlaying() || this.sourcesExhausted) return;
      void this.tryPlay();
      return;
    }

    this.desiredTrack = trackId;
    this.sourceIndex = 0;
    this.sourcesExhausted = false;
    this.pausedByVisibility = false;
    this.applySource();
    void this.tryPlay();
  }

  stopBGM(): void {
    this.desiredTrack = null;
    this.pausedByVisibility = false;
    this.playGeneration += 1;
    const audio = this.element;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  /** Corta o menu no clique de Entrar no mundo; ignora play até unlock. */
  lockForWorldEnter(): void {
    this.worldEnterLocked = true;
    this.stopBGM();
  }

  unlockMenuBgm(): void {
    this.worldEnterLocked = false;
  }

  syncToScreen(screenId: string): void {
    if (screenId === 'login-screen' && this.worldEnterLocked) {
      this.unlockMenuBgm();
    }
    if (shouldPlayMenuBgm(screenId, this.worldEnterLocked)) {
      this.playBGM(MENU_BGM_TRACK_ID);
      return;
    }
    if (screenId === 'game-container') {
      this.stopBGM();
    }
  }

  setVolume(value: number): void {
    this.volume = clampAudioVolume(value);
    if (this.element) {
      this.element.volume = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  private ensureRuntime(): void {
    if (typeof Audio === 'undefined' || typeof window === 'undefined') return;
    if (!this.element) {
      const audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = this.volume;
      audio.setAttribute('playsinline', 'true');
      audio.addEventListener('error', () => {
        this.advanceSource();
      });
      this.element = audio;
    }
    this.bindUnlock();
    this.bindVisibility();
  }

  private applySource(): void {
    const audio = this.element;
    const trackId = this.desiredTrack;
    if (!audio || !trackId) return;
    const urls = resolveBgmUrls(trackId);
    const url = urls[this.sourceIndex];
    if (!url) return;
    if (audio.src.endsWith(url) || audio.src.includes(url)) return;
    audio.src = url;
    audio.load();
  }

  private advanceSource(): void {
    const trackId = this.desiredTrack;
    if (!trackId) return;
    const urls = resolveBgmUrls(trackId);
    this.sourceIndex += 1;
    if (this.sourceIndex >= urls.length) {
      this.sourcesExhausted = true;
      if (this.element && this.element.src) {
        this.element.removeAttribute('src');
      }
      if (!this.missingWarned) {
        this.missingWarned = true;
        console.warn(
          `[audio] BGM ${trackId} ausente. Coloque o arquivo em public/assets/audio/bgm/login.ogg (ou .mp3).`,
        );
      }
      return;
    }
    this.applySource();
    void this.tryPlay();
  }

  private isElementPlaying(): boolean {
    const audio = this.element;
    return Boolean(audio && !audio.paused && !audio.ended);
  }

  private async tryPlay(): Promise<void> {
    const audio = this.element;
    if (!audio || !this.desiredTrack || this.worldEnterLocked) return;
    const generation = this.playGeneration;
    try {
      await audio.play();
    } catch {
      /* autoplay policy — espera o primeiro gesto (pointerdown/keydown) */
    }
    if (generation !== this.playGeneration) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  private bindUnlock(): void {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const unlock = (): void => {
      void this.tryPlay();
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
  }

  private bindVisibility(): void {
    if (this.visibilityBound || typeof document === 'undefined') return;
    this.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      const audio = this.element;
      if (!audio) return;
      if (document.hidden) {
        if (!audio.paused) {
          this.pausedByVisibility = true;
          audio.pause();
        }
        return;
      }
      if (this.pausedByVisibility && this.desiredTrack) {
        this.pausedByVisibility = false;
        void this.tryPlay();
      }
    });
  }
}

let instance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!instance) {
    instance = new AudioManager();
  }
  return instance;
}

export function resetAudioManager(): void {
  instance?.stopBGM();
  instance = null;
}
