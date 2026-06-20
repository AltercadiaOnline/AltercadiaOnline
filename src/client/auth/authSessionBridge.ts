import type { User } from '@supabase/supabase-js';

import type { AuthUser } from '../../shared/authService.js';

import { resolveAccountKey } from '../services/localSessionStore.js';

import { resetGameStoreState, activateGameStoreAfterAuth } from '../state/GameStore.js';

import { USER_OAUTH_FAILED } from '../../shared/brand.js';

import {
  clearAllOAuthFlags,
  clearOAuthRedirectPending,
  hasEmailConfirmationCallbackInUrl,
  hasOAuthCallbackInUrl,
  isOAuthRedirectPending,
} from '../services/auth/oauthPending.js';

import { clearPendingLoginServerId } from './resolveLoginServerId.js';

import {
  exchangeOAuthCallbackIfPresent,
  getUser,
  subscribeAuthStateChange,
} from './supabaseAuth.js';
import { isGoogleAuthUser } from '../../shared/auth/emailConfirmationPolicy.js';

export type AuthPostLoginOptions = {
  readonly serverId?: string;
  readonly oauthFlow?: boolean;
};

export type AuthSessionBridgeOptions = {
  onAuthenticated: (user: AuthUser, options?: AuthPostLoginOptions) => void | Promise<void>;
  onAuthError?: (message: string) => void;
  onSnapshotInitializing?: (message: string) => void;
  onSignedOut?: () => void;
};

function mapSupabaseUser(user: User): AuthUser {
  const email = user.email ?? '';

  return {
    email,
    id: user.id ?? resolveAccountKey({ email }),
    ...(user.user_metadata?.full_name
      ? { fullName: String(user.user_metadata.full_name) }
      : user.user_metadata?.nome
        ? { fullName: String(user.user_metadata.nome) }
        : {}),
  };
}

async function completeGoogleOAuthSession(
  user: User,
  options: AuthSessionBridgeOptions,
): Promise<boolean> {
  clearOAuthRedirectPending();

  const authUser = mapSupabaseUser(user);
  if (!authUser.email) {
    resetGameStoreState();
    options.onAuthError?.('Conta Google sem e-mail associado.');
    return false;
  }

  clearPendingLoginServerId();
  activateGameStoreAfterAuth();

  await options.onAuthenticated(authUser, { oauthFlow: true });
  return true;
}

/** Processa retorno OAuth (?code= ou flag pending) após redirect Google → front. */
export async function tryCompleteOAuthReturn(
  options: AuthSessionBridgeOptions,
): Promise<boolean> {
  if (hasEmailConfirmationCallbackInUrl()) {
    clearAllOAuthFlags();
    return false;
  }

  const oauthCallback = hasOAuthCallbackInUrl();
  const pending = isOAuthRedirectPending();

  if (!oauthCallback && !pending) return false;

  await exchangeOAuthCallbackIfPresent();

  const user = await getUser({ silent: true, clearInvalidSession: true });
  if (!user) {
    clearAllOAuthFlags();
    resetGameStoreState();
    if (oauthCallback || pending) {
      options.onAuthError?.(USER_OAUTH_FAILED);
      return true;
    }
    return false;
  }

  if (!oauthCallback && !isGoogleAuthUser(user)) {
    clearAllOAuthFlags();
    return false;
  }

  return completeGoogleOAuthSession(user, options);
}

let bridgeInitialized = false;

/** Listener Supabase — detecta sessão OAuth após redirect e hidrata GameStore. */
export function initAuthSessionBridge(options: AuthSessionBridgeOptions): () => void {
  if (bridgeInitialized) {
    return () => {};
  }

  bridgeInitialized = true;

  return subscribeAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      resetGameStoreState();
      options.onSignedOut?.();
      return;
    }

    if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return;

    if (!isOAuthRedirectPending() && !hasOAuthCallbackInUrl()) return;

    if (!session?.user) return;

    if (!isGoogleAuthUser(session.user)) {
      clearAllOAuthFlags();
      return;
    }

    void completeGoogleOAuthSession(session.user, options).catch((error) => {
      console.error('[Auth] Falha ao concluir OAuth:', error);
      resetGameStoreState();
      options.onAuthError?.('Erro inesperado após login com Google.');
    });
  });
}
