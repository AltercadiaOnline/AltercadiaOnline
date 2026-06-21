import type { AuthView } from '../app/auth/authView.js';
import { getAppScreenBridge } from '../app/bridge/appScreenBridge.js';
import { getAuthBridge } from '../app/bridge/authBridge.js';
import { getAuthScreenController } from '../app/screen/authScreenController.js';

export type { AuthView };

export function showAuthView(view: AuthView): void {
  getAppScreenBridge().setAuthView(view);
  getAuthScreenController().syncView(view);
}

export function copyLoginCredentialsToRegisterForm(): void {
  getAuthBridge().copyLoginToRegister();
}

export function copyRegisterCredentialsToLoginForm(): void {
  getAuthBridge().copyRegisterToLogin();
}

export { setAuthStatusMessage } from '../app/bridge/authBridge.js';
