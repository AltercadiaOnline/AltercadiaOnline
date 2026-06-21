import type { AuthUser } from '../../shared/authService.js';
import type { AuthPostLoginOptions } from '../auth/authSessionBridge.js';
import { initAuthScreenController } from '../app/screen/authScreenController.js';

export type LoginScreenOptions = {
  onAuthenticated: (user: AuthUser, options?: AuthPostLoginOptions) => void | Promise<void>;
};

/** Bootstrap auth — 100% React via AuthScreen + authScreenController. */
export function setupLoginScreen(options: LoginScreenOptions): boolean {
  return initAuthScreenController(options);
}
