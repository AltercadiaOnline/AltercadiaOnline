import { getSupabaseClient, resolveAuthRedirectUrl, clearLocalSupabaseSession } from './auth/supabaseAuth.js';
import {
  requestPasswordResetEmail,
  resendSignupConfirmationEmail,
  updateAccountPassword,
} from './auth/supabaseAuth.js';
import { logAuthApiAttempt, logAuthApiResult } from './auth/authDebug.js';
import { withAuthDeadline } from './auth/authDeadline.js';
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
import { isSupabaseEmailConfirmed, isDuplicateSignUpAttempt, SIGNUP_CONFIRM_EMAIL_HINT } from '../shared/auth/emailConfirmationPolicy.js';

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

  if (
    code === 'over_email_send_rate_limit'
    || /rate limit|too many requests|429/i.test(message)
  ) {
    return {
      ok: false,
      message:
        'Limite de envio de emails atingido. Aguarde alguns minutos e use "Reenviar email de confirmação".',
    };
  }

  return { ok: false, message: message || 'Falha na autenticação.' };
}

function buildSignupConfirmationSuccessMessage(): string {
  return `Cadastro realizado! Abra o email de confirmação antes de fazer login. ${SIGNUP_CONFIRM_EMAIL_HINT}`;
}

async function tryResendSignupConfirmation(email: string): Promise<AuthResult | null> {
  const resend = await resendSignupConfirmationEmail(email);
  if (resend.ok) {
    return {
      ok: true,
      needsEmailConfirmation: true,
      message: `Reenviamos o link de confirmação. ${SIGNUP_CONFIRM_EMAIL_HINT}`,
    };
  }
  return null;
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
    emailRedirectTo: resolveAuthRedirectUrl(),
  });

  const { data, error } = await withAuthDeadline(
    supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: resolveAuthRedirectUrl(),
        data: {
          nome: fullName,
          dataNascimento: birthDate,
          full_name: fullName,
          consentimento_responsavel: consentimentoResponsavel,
        },
      },
    }),
    'Cadastro demorou demais. Verifique sua conexão e tente novamente.',
    18_000,
  );

  if (error) {
    logAuthApiResult('register', 'error', { message: error.message, code: error.code ?? null });
    return mapSupabaseAuthError(error);
  }

  if (data.user && isDuplicateSignUpAttempt(data.user)) {
    logAuthApiResult('register', 'error', {
      reason: 'duplicate-email',
      userId: data.user.id,
    });
    clearLocalSupabaseSession();
    const resent = await tryResendSignupConfirmation(trimmedEmail);
    if (resent) {
      return {
        ...resent,
        message:
          `Este email já tinha cadastro pendente. ${resent.message}`,
      };
    }
    return {
      ok: false,
      needsEmailConfirmation: true,
      message:
        'Este email já está cadastrado. Faça login, use "Esqueci minha senha" ou clique em "Reenviar email de confirmação" se ainda não confirmou.',
    };
  }

  if (data.user && !data.session) {
    logAuthApiResult('register', 'success', {
      userId: data.user.id,
      needsEmailConfirm: true,
    });
    clearLocalSupabaseSession();
    return {
      ok: true,
      needsEmailConfirmation: true,
      message: buildSignupConfirmationSuccessMessage(),
    };
  }

  if (data.session && data.user && !isSupabaseEmailConfirmed(data.user)) {
    logAuthApiResult('register', 'success', {
      userId: data.user.id,
      needsEmailConfirm: true,
      clearedPrematureSession: true,
    });
    clearLocalSupabaseSession();
    return {
      ok: true,
      needsEmailConfirmation: true,
      message: buildSignupConfirmationSuccessMessage(),
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
  const { data, error } = await withAuthDeadline(
    supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    }),
    'Login demorou demais. Verifique sua conexão e tente novamente.',
  );

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

  if (data.user && !isSupabaseEmailConfirmed(data.user)) {
    clearLocalSupabaseSession();
    logAuthApiResult('login', 'error', { message: 'Email não confirmado' });
    return {
      ok: false,
      needsEmailConfirmation: true,
      message:
        'Confirme seu email antes de entrar. Abra o link que enviamos (verifique spam) ou reenvie na tela de cadastro.',
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
