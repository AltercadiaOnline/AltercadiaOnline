import type { AuthChangeEvent, Provider, Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { PublicClientConfig } from '../../shared/publicClientConfig.js';
import { isSupabaseConfigured } from '../../shared/publicClientConfig.js';
import { logAuthEnvironment } from './authDebug.js';
import { getClientRuntimeConfig } from '../runtime/clientRuntimeConfig.js';
import {
  AUTH_CALLBACK_PATH,
  buildAuthRedirectUrl,
  hasAuthTokensInUrl,
  resolveAuthCallbackPath,
} from '../../shared/auth/authCallback.js';
import { markOAuthCodeExchanged, suppressAuthSessionSideEffects } from '../services/auth/oauthPending.js';
import { withAuthDeadline } from './authDeadline.js';
import { mergePublicClientConfigWithGameOrigin } from '../../shared/net/mergeGameOriginConfig.js';
import type { GameOriginHints } from '../../shared/net/mergeGameOriginConfig.js';
import {
  USER_AUTH_NOT_CONFIGURED,
  USER_GOOGLE_LOGIN_UNAVAILABLE,
  USER_PASSWORD_RESET_UNAVAILABLE,
} from '../../shared/brand.js';

const SUPABASE_STORAGE_KEY = 'altercadia-supabase-auth';

let supabase: SupabaseClient | null = null;

/** redirectTo / emailRedirectTo — URL pública de produção (nunca preview Vercel). */
export function resolveAuthRedirectUrl(configOverride?: PublicClientConfig | null): string {
  const config = configOverride ?? getClientRuntimeConfig();
  return buildAuthRedirectUrl(undefined, config);
}

export { AUTH_CALLBACK_PATH };

function authRedirectUrl(): string {
  return resolveAuthRedirectUrl();
}

/** Inicializa o client Supabase — `config.supabaseUrl` é endpoint de API; nunca exibir na UI. */
export async function initSupabaseAuth(config: PublicClientConfig): Promise<boolean> {
  if (supabase) {
    logAuthEnvironment('initSupabaseAuth-already-ready');
    return true;
  }

  logAuthEnvironment('initSupabaseAuth-start', {
    gameWsUrl: config.gameWsUrl ?? null,
    gameHttpUrl: config.gameHttpUrl ?? null,
  });

  if (!isSupabaseConfigured(config)) {
    console.warn('[Auth] Supabase não configurado — defina SUPABASE_URL e SUPABASE_ANON_KEY.');
    return false;
  }

  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(config.supabaseUrl!, config.supabaseAnonKey!, {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage,
      storageKey: SUPABASE_STORAGE_KEY,
    },
  });
  logAuthEnvironment('initSupabaseAuth-ready');
  return true;
}

async function fetchStaticGameOriginHints(): Promise<GameOriginHints | null> {
  try {
    const response = await fetch('/config/game-origin.json', { credentials: 'omit' });
    if (!response.ok) return null;
    return await response.json() as GameOriginHints;
  } catch {
    return null;
  }
}

export type GetUserOptions = {
  /** Boot/leitura opcional — não emitir warn de sessão inválida. */
  readonly silent?: boolean;
  /** Remove token local expirado/inválido do storage. */
  readonly clearInvalidSession?: boolean;
};

export async function fetchPublicClientConfig(): Promise<PublicClientConfig> {
  console.debug('[AuthDebug:api] Bootstrap — GET /config/client');
  const response = await fetch('/config/client', { credentials: 'omit' });
  if (!response.ok) {
    console.error('[AuthDebug:api] Erro GET /config/client', { status: response.status });
    throw new Error(`Falha ao carregar /config/client (${response.status})`);
  }
  const raw = await response.json() as PublicClientConfig;
  const needsOrigin = !raw.gameWsUrl?.trim() && !raw.gameHttpUrl?.trim();
  const config = needsOrigin
    ? mergePublicClientConfigWithGameOrigin(raw, await fetchStaticGameOriginHints())
    : raw;
  console.debug('[AuthDebug:api] Sucesso GET /config/client', {
    supabaseConfigured: Boolean(config.supabaseUrl && config.supabaseAnonKey),
    gameWsConfigured: Boolean(config.gameWsUrl),
    gameHttpConfigured: Boolean(config.gameHttpUrl),
    serverId: config.serverId ?? null,
    mergedGameOrigin: needsOrigin && Boolean(config.gameWsUrl || config.gameHttpUrl),
  });
  return config;
}

export type OAuthProvider = Extract<Provider, 'google'>;

/**
 * Login social — Supabase Auth PKCE.
 * Redirect volta ao front-end atual em `/characters` (Vercel ou Railway).
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
): Promise<{ ok: boolean; message?: string }> {
  if (!supabase) {
    return { ok: false, message: USER_GOOGLE_LOGIN_UNAVAILABLE };
  }

  const redirectTo = authRedirectUrl();
  console.debug('[Auth] signInWithOAuth redirectTo:', redirectTo);

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    console.error('[Auth] Falha na autenticação OAuth:', error.message);
    return { ok: false, message: 'Não foi possível iniciar login com Google.' };
  }

  return { ok: true };
}

export async function signInWithGoogleOAuth(): Promise<{ ok: boolean; message?: string }> {
  return signInWithOAuth('google');
}

export function subscribeAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  if (!supabase) return () => {};

  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

export function clearAuthCallbackFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  url.searchParams.delete('token_hash');
  url.searchParams.delete('type');
  url.hash = '';
  const path = url.pathname === '/' ? AUTH_CALLBACK_PATH : url.pathname;
  window.history.replaceState({}, document.title, `${path}${url.search}`);
}

/**
 * Processa retorno Supabase na URL (?code= PKCE, #access_token= email, token_hash).
 * `detectSessionInUrl: true` no createClient — getSession() materializa a sessão.
 */
export async function exchangeOAuthCallbackIfPresent(): Promise<Session | null> {
  if (!supabase) return null;

  const url = new URL(window.location.href);
  const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (oauthError) {
    console.error('[Auth] OAuth cancelado ou recusado:', oauthError);
    clearAuthCallbackFromUrl();
    return null;
  }

  if (!hasAuthTokensInUrl(url.href)) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Auth] getSession falhou após boot.');
      return null;
    }
    return session;
  }

  const code = url.searchParams.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    clearAuthCallbackFromUrl();
    if (error) {
      console.error('[Auth] exchangeCodeForSession falhou:', error.message);
      return null;
    }
    markOAuthCodeExchanged();
    return data.session;
  }

  const tokenHash = url.searchParams.get('token_hash');
  const otpType = url.searchParams.get('type');
  if (tokenHash && otpType) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as 'signup' | 'email' | 'recovery' | 'magiclink' | 'invite',
    });
    clearAuthCallbackFromUrl();
    if (error) {
      console.error('[Auth] verifyOtp falhou:', error.message);
      return null;
    }
    return data.session;
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  clearAuthCallbackFromUrl();
  if (error) {
    console.warn('[Auth] getSession falhou ao ler hash de auth.');
    return null;
  }
  return session;
}

/** Restaura sessão persistida (localStorage) após reload ou retorno OAuth. */
export async function restorePersistedSession(): Promise<Session | null> {
  return exchangeOAuthCallbackIfPresent();
}

/** Valida sessão com o Supabase (getUser) — fonte de verdade antes de entrar no jogo. */
export async function getUser(options?: GetUserOptions): Promise<User | null> {
  if (!supabase) return null;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    if (options?.clearInvalidSession) {
      await supabase.auth.signOut({ scope: 'local' });
    }
    if (!options?.silent) {
      console.warn('[Auth] Sessão inválida ou expirada.');
    }
    return null;
  }

  return user;
}

/** JWT de acesso para Railway (HTTP + WebSocket) — nunca logar este valor. */
export async function resolveSessionAccessToken(): Promise<string | null> {
  if (!supabase) return null;

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    return null;
  }

  const user = await getUser({ silent: true, clearInvalidSession: true });
  if (!user) return null;

  return session.access_token;
}

export async function signOutSupabase(): Promise<void> {
  if (!supabase) return;
  try {
    await withAuthDeadline(
      supabase.auth.signOut(),
      'Encerramento de sessão demorou demais.',
      8_000,
    );
  } catch (error) {
    console.warn('[Auth] Falha ao encerrar sessão Supabase.', error);
    clearLocalSupabaseSession();
  }
}

/** Limpa sessão local sem disparar returnToLogin (side effects suprimidos). */
export function clearLocalSupabaseSession(): void {
  const release = suppressAuthSessionSideEffects();
  try {
    if (supabase) {
      void supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    try {
      localStorage.removeItem(SUPABASE_STORAGE_KEY);
    } catch {
      /* storage indisponível */
    }
  } finally {
    release();
  }
}

export async function resendSignupConfirmationEmail(
  email: string,
): Promise<{ ok: boolean; message: string }> {
  if (!supabase) {
    return { ok: false, message: USER_AUTH_NOT_CONFIGURED };
  }

  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, message: 'Informe seu email.' };
  }

  const { error } = await withAuthDeadline(
    supabase.auth.resend({
      type: 'signup',
      email: trimmed,
      options: {
        emailRedirectTo: authRedirectUrl(),
      },
    }),
    'Reenvio de confirmação demorou demais. Tente novamente em instantes.',
    12_000,
  );

  if (error) {
    const message = /rate limit|too many|429/i.test(error.message)
      ? 'Limite de envio de emails atingido. Aguarde alguns minutos e tente de novo.'
      : error.message;
    return { ok: false, message };
  }

  return {
    ok: true,
    message: 'Email de confirmação reenviado. Verifique sua caixa de entrada e spam.',
  };
}

export async function requestPasswordResetEmail(email: string): Promise<{ ok: boolean; message: string }> {
  if (!supabase) {
    return { ok: false, message: USER_PASSWORD_RESET_UNAVAILABLE };
  }

  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, message: 'Informe seu email.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: authRedirectUrl(),
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: 'Link de recuperação enviado. Verifique seu email.',
  };
}

export async function updateAccountPassword(password: string): Promise<{ ok: boolean; message: string }> {
  if (!supabase) {
    return { ok: false, message: USER_AUTH_NOT_CONFIGURED };
  }

  if (!password || password.length < 6) {
    return { ok: false, message: 'A senha deve ter pelo menos 6 caracteres.' };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: 'Senha atualizada com sucesso.' };
}

export function isPasswordRecoverySession(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  const search = window.location.search;
  return hash.includes('type=recovery') || search.includes('type=recovery');
}

export function clearPasswordRecoveryUrl(): void {
  clearAuthCallbackFromUrl();
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}

export function isSupabaseReady(): boolean {
  return supabase !== null;
}
