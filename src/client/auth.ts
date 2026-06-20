import { getSupabaseClient } from './auth/supabaseAuth.js';
import {
  requestPasswordResetEmail,
  resendSignupConfirmationEmail,
  updateAccountPassword,
} from './auth/supabaseAuth.js';
import { logAuthApiAttempt, logAuthApiResult } from './auth/authDebug.js';
import {
  USER_AUTH_NOT_CONFIGURED,
  USER_REGISTER_UNAVAILABLE,
} from '../shared/brand.js';
import {
  ADULT_AGE_YEARS,
  computeAgeYears,
  isAtLeastAge,
  parseBirthDateIso,
} from '../shared/auth/accountAgePolicy.js';

export type AuthResult = {
  ok: boolean;
  message: string;
  readonly needsEmailConfirmation?: boolean;
};

export type AuthSignUpProfile = {
  readonly fullName?: string;
  readonly birthDate?: string;
  readonly parentalConsent?: boolean;
};

export { ADULT_AGE_YEARS, computeAgeYears, isAtLeastAge };

function mapSupabaseAuthError(error: { message?: string; code?: string | null | undefined }): AuthResult {
  const code = String(error.code ?? '');
  const message = error.message ?? '';

  if (
    code === 'email_not_confirmed'
    || message.toLowerCase().includes('email not confirmed')
  ) {
    return {
      ok: false,
      needsEmailConfirmation: true,
      message:
        'Confirme seu email antes de entrar. Abra o link que enviamos (verifique spam) ou clique em "Reenviar confirmação".',
    };
  }

  if (code === 'invalid_credentials' || message.toLowerCase().includes('invalid login credentials')) {
    return { ok: false, message: 'Email ou senha incorretos.' };
  }

  return { ok: false, message: message || 'Falha na autenticação.' };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  profile?: AuthSignUpProfile,
): Promise<AuthResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { ok: false, message: 'Preencha email e senha.' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    logAuthApiResult('register', 'error', { message: 'Supabase client ausente' });
    return {
      ok: false,
      message: USER_REGISTER_UNAVAILABLE,
    };
  }

  const fullName = profile?.fullName?.trim() ?? '';
  const birthDate = profile?.birthDate?.trim() ?? '';

  if (!fullName) {
    return { ok: false, message: 'Informe seu nome.' };
  }

  if (!birthDate) {
    return { ok: false, message: 'Informe sua data de nascimento.' };
  }

  if (!parseBirthDateIso(birthDate)) {
    return { ok: false, message: 'Data de nascimento inválida.' };
  }

  const consentimentoResponsavel = profile?.parentalConsent === true;

  logAuthApiAttempt('register', {
    via: 'supabase.auth.signUp',
    hasNome: Boolean(fullName),
    hasDataNascimento: Boolean(birthDate),
    consentimentoResponsavel,
  });

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      data: {
        nome: fullName,
        dataNascimento: birthDate,
        full_name: fullName,
        consentimento_responsavel: consentimentoResponsavel,
      },
    },
  });

  if (error) {
    logAuthApiResult('register', 'error', { message: error.message, code: error.code ?? null });
    return mapSupabaseAuthError(error);
  }

  if (data.user && !data.session) {
    logAuthApiResult('register', 'success', {
      userId: data.user.id,
      needsEmailConfirm: true,
    });
    return {
      ok: true,
      needsEmailConfirmation: true,
      message:
        'Cadastro realizado! Abra o email de confirmação antes de fazer login (verifique spam).',
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
      message: USER_AUTH_NOT_CONFIGURED,
    };
  }

  logAuthApiAttempt('login', { via: 'supabase.auth.signInWithPassword' });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    logAuthApiResult('login', 'error', { message: error.message, code: error.code ?? null });
    return mapSupabaseAuthError(error);
  }

  if (!data.session) {
    logAuthApiResult('login', 'error', { message: 'Sem sessão — confirme o email' });
    return {
      ok: false,
      needsEmailConfirmation: true,
      message: 'Confirme seu email antes de entrar.',
    };
  }

  logAuthApiResult('login', 'success', {
    userId: data.user?.id ?? null,
    hasSession: true,
  });
  return { ok: true, message: 'Login realizado.' };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const result = await requestPasswordResetEmail(email);
  return { ok: result.ok, message: result.message };
}

export async function resendEmailConfirmation(email: string): Promise<AuthResult> {
  const result = await resendSignupConfirmationEmail(email);
  return { ok: result.ok, message: result.message };
}

export async function applyPasswordReset(password: string): Promise<AuthResult> {
  const result = await updateAccountPassword(password);
  return { ok: result.ok, message: result.message };
}
