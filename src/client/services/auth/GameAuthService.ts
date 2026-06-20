/**
 * FLUXO DE DADOS — GameAuthService
 *
 * UI (loginScreen, LoginWithGoogle) → GameAuthService
 *   → supabase-js (signInWithOAuth / signInWithEmail via createAuthService)
 *   → authSessionBridge (OAuth redirect + onAuthStateChange)
 *   → playerProfileClient.initializeAuthoritativePlayerSnapshot (GET /api/player-snapshot)
 *   → GameStore.activateAfterAuth / markHydrated via GlobalStateSynchronizer
 *
 * UI nunca importa supabaseAuth.ts nem gameDataRepository.ts diretamente.
 */

import type { AuthRegisterPayload, AuthService, AuthUser } from '../../../shared/authService.js';
import { createAuthService } from '../../auth/createAuthService.js';
import { clearPendingLoginServerId } from '../../auth/resolveLoginServerId.js';
import {
  clearAllOAuthFlags,
  clearOAuthRedirectPending,
  isOAuthRedirectPending,
  markOAuthRedirectPending,
} from './oauthPending.js';
import {
  activateGameStoreAfterAuth,
  resetGameStoreState,
} from '../../state/GameStore.js';
import {
  initAuthSessionBridge,
  tryCompleteOAuthReturn,
  type AuthSessionBridgeOptions,
} from '../../auth/authSessionBridge.js';
import {
  fetchPublicClientConfig,
  initSupabaseAuth,
  isSupabaseReady,
  restorePersistedSession,
  signInWithOAuth,
  signOutSupabase,
} from '../../auth/supabaseAuth.js';
import { isSupabaseConfigured } from '../../../shared/publicClientConfig.js';
import { USER_GOOGLE_LOGIN_UNAVAILABLE, USER_GOOGLE_REDIRECT } from '../../../shared/brand.js';
import { reportTransactionFailure } from '../../core/GameTransactionCoordinator.js';

export type AuthLoginResult = {
  readonly success: boolean;
  readonly user?: AuthUser;
  readonly message?: string;
  readonly serverId?: string;
};

let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  authServiceInstance ??= createAuthService();
  return authServiceInstance;
}

export async function initializeSupabaseFromServer(): Promise<boolean> {
  try {
    const config = await fetchPublicClientConfig();
    if (!isSupabaseConfigured(config)) return false;
    return initSupabaseAuth(config);
  } catch {
    return false;
  }
}

export function isGoogleAuthAvailable(): boolean {
  return isSupabaseReady();
}

export async function loginWithEmail(email: string, password: string): Promise<AuthLoginResult> {
  return loginWithEmailForServer(email, password);
}

/**
 * Login Fase P1 — exige server_id explícito antes de autenticar no Supabase.
 * Após sucesso, ativa o GameStore para o init pesado pós-login (char hub / snapshot).
 */
export async function loginWithEmailForServer(
  email: string,
  password: string,
): Promise<AuthLoginResult> {
  const result = await getAuthService().login(email, password);
  if (!result.success) {
    const message = result.message ?? 'Credenciais inválidas.';
    reportTransactionFailure(null, message, 'Falha no login.', { silent: true });
    return { success: false, message };
  }

  if (!result.user) {
    const message = 'Login sem dados de usuário.';
    reportTransactionFailure(null, message, 'Falha no login.', { silent: true });
    return { success: false, message };
  }

  clearPendingLoginServerId();
  activateGameStoreAfterAuth();
  return {
    success: true,
    user: result.user,
    ...(result.message ? { message: result.message } : {}),
  };
}

export async function registerAccount(
  payload: AuthRegisterPayload,
): Promise<{ success: boolean; message?: string; needsEmailConfirmation?: boolean }> {
  return getAuthService().register(payload);
}

export async function startGoogleOAuth(): Promise<{ ok: boolean; message?: string }> {
  if (!isSupabaseReady()) {
    const message = USER_GOOGLE_LOGIN_UNAVAILABLE;
    reportTransactionFailure(null, message, message);
    return { ok: false, message };
  }

  markOAuthRedirectPending();
  const result = await signInWithOAuth('google');

  if (!result.ok) {
    clearAllOAuthFlags();
    resetGameStoreState();
    reportTransactionFailure(null, result.message ?? 'Falha OAuth.', 'Login com Google falhou.');
  }

  return result;
}

export async function hydrateAuthenticatedProfile(
  characterId?: number,
): Promise<{ ok: boolean; message?: string }> {
  const { initializeAuthoritativePlayerSnapshot } = await import('../../auth/playerProfileClient.js');
  const result = await initializeAuthoritativePlayerSnapshot(characterId);

  if (!result.ok) {
    reportTransactionFailure(null, result.message ?? 'Perfil indisponível.', 'Falha ao carregar perfil.');
  }

  return result;
}

export function setupAuthSessionBridge(options: AuthSessionBridgeOptions): () => void {
  return initAuthSessionBridge(options);
}

export async function completeOAuthReturnIfPending(
  options: AuthSessionBridgeOptions,
): Promise<boolean> {
  return tryCompleteOAuthReturn(options);
}

export async function signOut(): Promise<void> {
  await signOutSupabase();
  resetGameStoreState();
  clearAllOAuthFlags();
}

export function bindGoogleLoginButton(options: LoginWithGoogleOptions): () => void {
  const handler = (): void => {
    void (async () => {
      options.setBusy?.(true);
      options.onStatus?.(USER_GOOGLE_REDIRECT, false);

      const result = await startGoogleOAuth();
      if (!result.ok) {
        options.onStatus?.(result.message ?? 'Não foi possível iniciar login com Google.', true);
        options.setBusy?.(false);
      }
    })();
  };

  options.button.addEventListener('click', handler);
  return () => options.button.removeEventListener('click', handler);
}

export { isOAuthRedirectPending, markOAuthRedirectPending, clearOAuthRedirectPending, clearAllOAuthFlags };

export type LoginWithGoogleOptions = {
  button: HTMLButtonElement;
  onStatus?: (message: string, isError: boolean) => void;
  setBusy?: (busy: boolean) => void;
};
