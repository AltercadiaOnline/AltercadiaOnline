import type { AuthChangeEvent, Provider, Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { PublicClientConfig } from '../../shared/publicClientConfig.js';
import { isSupabaseConfigured } from '../../shared/publicClientConfig.js';
import { logAuthEnvironment } from './authDebug.js';

const SUPABASE_STORAGE_KEY = 'altercadia-supabase-auth';

let supabase: SupabaseClient | null = null;

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
 * Login social — exclusivamente via Supabase Auth (PKCE).
 * Redirect volta ao origin do front; sessão em localStorage (sem cookies Vercel).
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
): Promise<{ ok: boolean; message?: string }> {
  if (!supabase) {
    return { ok: false, message: 'Supabase não configurado no cliente.' };
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}`;

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

/** @deprecated Use signInWithOAuth('google') */
export async function loginWithGoogle(): Promise<void> {
  await signInWithGoogleOAuth();
}

export function subscribeAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  if (!supabase) return () => {};

  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

/** Restaura sessão persistida (localStorage) após reload ou retorno OAuth. */
export async function restorePersistedSession(): Promise<Session | null> {
  if (!supabase) return null;

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('[Auth] Falha ao restaurar sessão persistida.');
    return null;
  }

  return session;
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

export async function requestPasswordResetEmail(email: string): Promise<{ ok: boolean; message: string }> {
  if (!supabase) {
    return { ok: false, message: 'Supabase não configurado no cliente.' };
  }

  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, message: 'Informe seu email.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: `${window.location.origin}${window.location.pathname}`,
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

/** Detecta fluxo de recuperação (link do email Supabase). */
export function isPasswordRecoverySession(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  const search = window.location.search;
  return hash.includes('type=recovery') || search.includes('type=recovery');
}

export function clearPasswordRecoveryUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.delete('type');
  url.searchParams.delete('code');
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}

export function isSupabaseReady(): boolean {
  return supabase !== null;
}
