import type { User } from '@supabase/supabase-js';

import type { AuthUser } from '../../shared/authService.js';

import { resolveAccountKey } from '../services/localSessionStore.js';

import { resetGameStoreState, activateGameStoreAfterAuth } from '../state/GameStore.js';

import {
  clearOAuthRedirectPending,
  hasOAuthCallbackInUrl,
  isOAuthRedirectPending,
} from '../services/auth/oauthPending.js';

import { clearPendingLoginServerId } from './resolveLoginServerId.js';

import {
  exchangeOAuthCallbackIfPresent,
  getUser,
  subscribeAuthStateChange,
} from './supabaseAuth.js';

export type AuthSessionBridgeOptions = {
  onAuthenticated: (user: AuthUser, serverId?: string) => void | Promise<void>;
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

  await options.onAuthenticated(authUser);
  return true;
}

/** Processa retorno OAuth (?code= ou flag pending) após redirect Google → front. */
export async function tryCompleteOAuthReturn(
  options: AuthSessionBridgeOptions,
): Promise<boolean> {
  const oauthCallback = hasOAuthCallbackInUrl();
  const pending = isOAuthRedirectPending();

  if (!oauthCallback && !pending) return false;

  await exchangeOAuthCallbackIfPresent();

  const user = await getUser();
  if (!user) {
    clearOAuthRedirectPending();
    resetGameStoreState();
    options.onAuthError?.(
      oauthCallback || pending
        ? 'Login com Google não foi concluído. Verifique Redirect URLs no Supabase (seu domínio Vercel).'
        : 'Login com Google não foi concluído. Tente novamente.',
    );
    return true;
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

    void completeGoogleOAuthSession(session.user, options).catch((error) => {
      console.error('[Auth] Falha ao concluir OAuth:', error);
      resetGameStoreState();
      options.onAuthError?.('Erro inesperado após login com Google.');
    });
  });
}
