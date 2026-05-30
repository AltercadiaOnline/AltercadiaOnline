import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { PublicClientConfig } from '../../shared/publicClientConfig.js';
import { isSupabaseConfigured } from '../../shared/publicClientConfig.js';

let supabase: SupabaseClient | null = null;

/** Inicializa o client — URL e anon key vêm do servidor (SUPABASE_URL / SUPABASE_ANON_KEY). */
export async function initSupabaseAuth(config: PublicClientConfig): Promise<boolean> {
  if (!isSupabaseConfigured(config)) {
    console.warn('[Auth] Supabase não configurado — defina SUPABASE_URL e SUPABASE_ANON_KEY.');
    return false;
  }

  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(config.supabaseUrl!, config.supabaseAnonKey!);
  return true;
}

export async function fetchPublicClientConfig(): Promise<PublicClientConfig> {
  const response = await fetch('/config/client');
  if (!response.ok) {
    throw new Error(`Falha ao carregar /config/client (${response.status})`);
  }
  return response.json() as Promise<PublicClientConfig>;
}

export async function loginWithGoogle(): Promise<void> {
  if (!supabase) {
    console.error('[Auth] Supabase não configurado.');
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error('Erro na autenticação:', error.message);
  }
}

export async function getUser(): Promise<User | null> {
  if (!supabase) return null;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('[Auth] Erro ao ler usuário:', error);
    return null;
  }

  return user;
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}

export function isSupabaseReady(): boolean {
  return supabase !== null;
}
