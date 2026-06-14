import { getSupabaseClient } from './auth/supabaseAuth.js';

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
    return {
      ok: false,
      message: 'Cadastro disponível apenas com Supabase Auth configurado.',
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  if (data.user && !data.session) {
    return {
      ok: true,
      message: 'Cadastro realizado. Verifique seu email para confirmar a conta.',
    };
  }

  return { ok: true, message: 'Conta criada com sucesso.' };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { ok: false, message: 'Preencha email e senha.' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      message: 'Login com senha requer Supabase Auth. Configure SUPABASE_URL e SUPABASE_ANON_KEY.',
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!data.session) {
    return { ok: false, message: 'Confirme seu email antes de entrar.' };
  }

  return { ok: true, message: 'Login realizado.' };
}
