import { getAuthScreenController } from '../screen/authScreenController.js';

type AuthBridgeListener = () => void;

type AuthScreenControllerRef = ReturnType<typeof getAuthScreenController>;

class AuthBridge {
  private controller: AuthScreenControllerRef | null = null;

  private readonly listeners = new Set<AuthBridgeListener>();

  attachController(controller: AuthScreenControllerRef): void {
    this.controller = controller;
    this.emit();
  }

  subscribe(listener: AuthBridgeListener): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  getController(): AuthScreenControllerRef | null {
    return this.controller;
  }

  copyLoginToRegister(): void {
    this.controller?.copyLoginToRegister();
  }

  copyRegisterToLogin(): void {
    this.controller?.copyRegisterToLogin();
  }

  hideBootstrapRetry(): void {
    document.getElementById('auth-bootstrap-retry')?.classList.add('hidden');
  }

  showBootstrapRetry(onRetry: () => void): void {
    const host = document.getElementById('auth-bootstrap-retry');
    host?.classList.remove('hidden');
    const btn = host?.querySelector<HTMLButtonElement>('[data-auth-bootstrap-retry]');
    if (!btn) return;
    btn.onclick = () => onRetry();
  }
}

type GlobalWithAuthBridge = typeof globalThis & {
  __ALTERCADIA_AUTH_BRIDGE__?: AuthBridge;
};

export function getAuthBridge(): AuthBridge {
  const globalBridge = globalThis as GlobalWithAuthBridge;
  if (!globalBridge.__ALTERCADIA_AUTH_BRIDGE__) {
    globalBridge.__ALTERCADIA_AUTH_BRIDGE__ = new AuthBridge();
  }
  return globalBridge.__ALTERCADIA_AUTH_BRIDGE__;
}

export function setAuthStatusMessage(
  message: string,
  options: { readonly isError?: boolean } = {},
): void {
  const controller = getAuthBridge().getController();
  if (controller) {
    controller.setStatus(message, options.isError === true);
    return;
  }

  const el = document.getElementById('auth-status-message');
  if (el) {
    el.textContent = message;
    el.classList.toggle('auth-status-message--error', options.isError === true);
    return;
  }

  const legacyEl = document.getElementById('auth-status');
  if (!legacyEl) return;
  legacyEl.textContent = message;
  legacyEl.classList.toggle('is-error', options.isError === true);
  legacyEl.classList.toggle('is-success', options.isError !== true && message.length > 0);
}
