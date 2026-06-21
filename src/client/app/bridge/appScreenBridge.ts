import type { AuthView } from '../../services/authFlow.js';

export type AppScreenId =
  | 'login-screen'
  | 'char-select-screen'
  | 'game-container'
  | string;

export type AppScreenSnapshot = {
  readonly activeScreen: AppScreenId;
  readonly authView: AuthView;
};

type AppScreenListener = (snapshot: AppScreenSnapshot) => void;

const DEFAULT_SNAPSHOT: AppScreenSnapshot = {
  activeScreen: 'login-screen',
  authView: 'login',
};

class AppScreenBridge {
  private snapshotState: AppScreenSnapshot = DEFAULT_SNAPSHOT;

  private readonly listeners = new Set<AppScreenListener>();

  subscribe(listener: AppScreenListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshotState);
    return () => this.listeners.delete(listener);
  }

  snapshot(): AppScreenSnapshot {
    return this.snapshotState;
  }

  setActiveScreen(activeScreen: AppScreenId): void {
    this.snapshotState = {
      ...this.snapshotState,
      activeScreen,
    };
    this.emit();
  }

  setAuthView(authView: AuthView): void {
    this.snapshotState = {
      ...this.snapshotState,
      authView,
    };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.snapshotState);
    }
  }
}

type GlobalWithScreenBridge = typeof globalThis & {
  __ALTERCADIA_APP_SCREEN_BRIDGE__?: AppScreenBridge;
};

export function getAppScreenBridge(): AppScreenBridge {
  const globalScreen = globalThis as GlobalWithScreenBridge;
  if (!globalScreen.__ALTERCADIA_APP_SCREEN_BRIDGE__) {
    globalScreen.__ALTERCADIA_APP_SCREEN_BRIDGE__ = new AppScreenBridge();
  }
  return globalScreen.__ALTERCADIA_APP_SCREEN_BRIDGE__;
}
