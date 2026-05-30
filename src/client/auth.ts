import { getSupabaseClient } from './auth/supabaseAuth.js';

export type AuthResult = {
  ok: boolean;
  message: string;
};

export type MockLoginResult = {
  success: boolean;
  user: { email: string };
};

/** Simula o login do Supabase enquanto o backend de auth não está disponível. */
export async function loginWithEmail(email: string, pass: string): Promise<MockLoginResult> {
  console.log('Simulando login para:', email);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, user: { email: email.trim() } });
    }, 500);
  });
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { ok: false, message: 'Preencha email e senha.' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('Simulando cadastro para:', trimmedEmail);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { ok: true, message: 'Cadastro simulado. Use Entrar para continuar.' };
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
    const mock = await loginWithEmail(trimmedEmail, password);
    if (!mock.success) {
      return { ok: false, message: 'Falha no login simulado.' };
    }
    return { ok: true, message: 'Login simulado (dev).' };
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
