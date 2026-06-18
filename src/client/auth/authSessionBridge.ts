import type { User } from '@supabase/supabase-js';

import type { AuthUser } from '../../shared/authService.js';

import { resolveAccountKey } from '../services/localSessionStore.js';

import { resetGameStoreState, activateGameStoreAfterAuth } from '../state/GameStore.js';

import {
  clearOAuthRedirectPending,
  isOAuthRedirectPending,
} from '../services/auth/oauthPending.js';

import {
  applyLoginServerIdToRuntime,
  clearPendingLoginServerId,
  readPendingLoginServerId,
  resolveLoginServerId,
} from './resolveLoginServerId.js';
import { ARCHITECTURE_SERVER_ID_REQUIRED } from '../../shared/supabase/characterServerScope.js';

import { getUser, subscribeAuthStateChange } from './supabaseAuth.js';

export type AuthSessionBridgeOptions = {
  onAuthenticated: (user: AuthUser, serverId?: string) => void | Promise<void>;
  onAuthError?: (message: string) => void;
  onSnapshotInitializing?: (message: string) => void;
};
function mapSupabaseUser(user: User): AuthUser {

  const email = user.email ?? '';

  return {

    email,

    id: user.id ?? resolveAccountKey({ email }),

    ...(user.user_metadata?.full_name

      ? { fullName: String(user.user_metadata.full_name) }

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



  let serverId: string;
  try {
    serverId = readPendingLoginServerId() ?? resolveLoginServerId();
  } catch {
    resetGameStoreState();
    options.onAuthError?.(ARCHITECTURE_SERVER_ID_REQUIRED);
    return false;
  }

  applyLoginServerIdToRuntime(serverId);
  console.log(`Login iniciado para ServerID: ${serverId}`);
  clearPendingLoginServerId();
  activateGameStoreAfterAuth();

  options.onAuthenticated(authUser, serverId);

  return true;

}



/** Processa retorno OAuth após redirect (hash PKCE) quando a flag pending está ativa. */

export async function tryCompleteOAuthReturn(

  options: AuthSessionBridgeOptions,

): Promise<boolean> {

  if (!isOAuthRedirectPending()) return false;



  const user = await getUser();

  if (!user) {

    clearOAuthRedirectPending();

    resetGameStoreState();

    options.onAuthError?.('Login com Google não foi concluído. Tente novamente.');

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

      return;

    }



    if (event !== 'SIGNED_IN') return;

    if (!isOAuthRedirectPending()) return;

    if (!session?.user) return;



    void completeGoogleOAuthSession(session.user, options).catch((error) => {

      console.error('[Auth] Falha ao concluir OAuth:', error);

      resetGameStoreState();

      options.onAuthError?.('Erro inesperado após login com Google.');

    });

  });

}


