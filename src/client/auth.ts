import { getSupabaseClient } from './auth/supabaseAuth.js';
import { logAuthApiAttempt, logAuthApiResult } from './auth/authDebug.js';

export type AuthResult = {
  ok: boolean;
  message: string;
};

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { ok: false, message: 'Preencha email e senha.' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    logAuthApiResult('register', 'error', { message: 'Supabase client ausente' });
    return {
      ok: false,
      message: 'Cadastro disponível apenas com Supabase Auth configurado.',
    };
  }

  logAuthApiAttempt('register', { via: 'supabase.auth.signUp' });
  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    logAuthApiResult('register', 'error', { message: error.message, code: error.code ?? null });
    return { ok: false, message: error.message };
  }

  if (data.user && !data.session) {
    logAuthApiResult('register', 'success', {
      userId: data.user.id,
      needsEmailConfirm: true,
    });
    return {
      ok: true,
      message: 'Cadastro realizado. Verifique seu email para confirmar a conta.',
    };
  }

  logAuthApiResult('register', 'success', {
    userId: data.user?.id ?? null,
    hasSession: Boolean(data.session),
  });
  return { ok: true, message: 'Conta criada com sucesso.' };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { ok: false, message: 'Preencha email e senha.' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    logAuthApiResult('login', 'error', { message: 'Supabase client ausente' });
    return {
      ok: false,
      message: 'Login com senha requer Supabase Auth. Configure SUPABASE_URL e SUPABASE_ANON_KEY.',
    };
  }

  logAuthApiAttempt('login', { via: 'supabase.auth.signInWithPassword' });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    logAuthApiResult('login', 'error', { message: error.message, code: error.code ?? null });
    return { ok: false, message: error.message };
  }

  if (!data.session) {
    logAuthApiResult('login', 'error', { message: 'Sem sessão — confirme o email' });
    return { ok: false, message: 'Confirme seu email antes de entrar.' };
  }

  logAuthApiResult('login', 'success', {
    userId: data.user?.id ?? null,
    hasSession: true,
  });
  return { ok: true, message: 'Login realizado.' };
}
