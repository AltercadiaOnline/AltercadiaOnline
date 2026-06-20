import type { AuthChangeEvent, Provider, Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { PublicClientConfig } from '../../shared/publicClientConfig.js';
import { isSupabaseConfigured } from '../../shared/publicClientConfig.js';
import { logAuthEnvironment } from './authDebug.js';

const SUPABASE_STORAGE_KEY = 'altercadia-supabase-auth';

let supabase: SupabaseClient | null = null;

function authRedirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

/** Inicializa o client — URL e anon key vêm via GET /config/client (bootstrap estático). */
export async function initSupabaseAuth(config: PublicClientConfig): Promise<boolean> {
  if (supabase) {
    logAuthEnvironment('initSupabaseAuth-already-ready');
    return true;
  }

  logAuthEnvironment('initSupabaseAuth-start', {
    supabaseUrl: config.supabaseUrl ?? null,
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

export async function fetchPublicClientConfig(): Promise<PublicClientConfig> {
  console.log('[AuthDebug:api] Bootstrap — GET /config/client');
  const response = await fetch('/config/client', { credentials: 'omit' });
  if (!response.ok) {
    console.error('[AuthDebug:api] Erro GET /config/client', { status: response.status });
    throw new Error(`Falha ao carregar /config/client (${response.status})`);
  }
  const config = await response.json() as PublicClientConfig;
  console.log('[AuthDebug:api] Sucesso GET /config/client', {
    supabaseUrl: config.supabaseUrl ?? null,
    gameWsUrl: config.gameWsUrl ?? null,
    gameHttpUrl: config.gameHttpUrl ?? null,
    serverId: config.serverId ?? null,
  });
  return config;
}

export type OAuthProvider = Extract<Provider, 'google'>;

/**
 * Login social — Supabase Auth PKCE.
 * Redirect volta ao front (Vercel) — esperado; sessão fica em localStorage.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
): Promise<{ ok: boolean; message?: string }> {
  if (!supabase) {
    return { ok: false, message: 'Supabase não configurado no cliente.' };
  }

  const redirectTo = authRedirectUrl();

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
  url.hash = '';
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}

/**
 * Troca ?code= PKCE por sessão após redirect Google → Vercel.
 * Deve rodar antes de getUser() no boot.
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

  const code = url.searchParams.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    clearAuthCallbackFromUrl();
    if (error) {
      console.error('[Auth] exchangeCodeForSession falhou:', error.message);
      return null;
    }
    return data.session;
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('[Auth] getSession falhou após boot.');
    return null;
  }
  return session;
}

/** Restaura sessão persistida (localStorage) após reload ou retorno OAuth. */
export async function restorePersistedSession(): Promise<Session | null> {
  return exchangeOAuthCallbackIfPresent();
}

/** Valida sessão com o Supabase (getUser) — fonte de verdade antes de entrar no jogo. */
export async function getUser(): Promise<User | null> {
  if (!supabase) return null;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.warn('[Auth] Sessão inválida ou expirada.');
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

  const user = await getUser();
  if (!user) return null;

  return session.access_token;
}

export async function signOutSupabase(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('[Auth] Falha ao encerrar sessão Supabase.');
  }
}

export async function resendSignupConfirmationEmail(
  email: string,
): Promise<{ ok: boolean; message: string }> {
  if (!supabase) {
    return { ok: false, message: 'Supabase não configurado no cliente.' };
  }

  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, message: 'Informe seu email.' };
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: trimmed,
    options: {
      emailRedirectTo: authRedirectUrl(),
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: 'Email de confirmação reenviado. Verifique sua caixa de entrada e spam.',
  };
}

export async function requestPasswordResetEmail(email: string): Promise<{ ok: boolean; message: string }> {
  if (!supabase) {
    return { ok: false, message: 'Supabase não configurado no cliente.' };
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
    return { ok: false, message: 'Supabase não configurado no cliente.' };
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
