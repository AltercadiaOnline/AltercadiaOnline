import type { AuthService } from '../../shared/authService.js';
import { getSupabaseClient, getUser } from './supabaseAuth.js';
import { signInWithEmail, signUpWithEmail } from '../auth.js';
import { resolveAccountKey } from '../services/localSessionStore.js';
import { loginLocalDevAccount } from './localDevAuth.js';
import { isLocalDevHost } from './localDevAuth.js';
import { mockAuth } from '../services/mockAuth.js';
import { logAuthApiAttempt, logAuthApiResult } from './authDebug.js';

function createSupabaseAuthService(): AuthService {
  return {
    async login(email, pass) {
      logAuthApiAttempt('login', {
        provider: 'supabase',
        hasClient: Boolean(getSupabaseClient()),
      });
      const result = await signInWithEmail(email, pass);
      if (!result.ok) {
        logAuthApiResult('login', 'error', { message: result.message });
        return { success: false, message: result.message };
      }

      const trimmedEmail = email.trim();
      const supabaseUser = await getUser();
      const accountKey = supabaseUser?.id ?? resolveAccountKey({ email: trimmedEmail });

      logAuthApiResult('login', 'success', { userId: accountKey });
      return {
        success: true,
        user: {
          email: trimmedEmail,
          id: accountKey,
        },
        message: result.message,
      };
    },

    async register(payload) {
      logAuthApiAttempt('register', {
        provider: 'supabase',
        hasClient: Boolean(getSupabaseClient()),
        email: payload.email.trim(),
      });
      const result = await signUpWithEmail(payload.email, payload.password);
      logAuthApiResult(result.ok ? 'register' : 'register', result.ok ? 'success' : 'error', {
        message: result.message,
      });
      return {
        success: result.ok,
        message: result.message,
      };
    },
  };
}

/** Usa Supabase quando configurado; caso contrário, cai no mock local. */
export function createAuthService(): AuthService {
  const supabaseAuth = createSupabaseAuthService();

  return {
    async login(email, pass) {
      if (!getSupabaseClient()) {
        if (!isLocalDevHost()) {
          logAuthApiResult('login', 'error', {
            message: 'Supabase não configurado em produção.',
          });
          return {
            success: false,
            message: 'Login requer Supabase Auth configurado neste ambiente.',
          };
        }
        logAuthApiAttempt('login', { provider: 'local-dev' });
        const result = await loginLocalDevAccount(email, pass);
        logAuthApiResult('login', result.ok ? 'success' : 'error', { message: result.message });
        if (!result.ok || !result.user) {
          return { success: false, message: result.message };
        }
        return {
          success: true,
          user: result.user,
          message: result.message,
        };
      }
      return supabaseAuth.login(email, pass);
    },

    async register(payload) {
      if (!getSupabaseClient()) {
        if (!isLocalDevHost()) {
          return {
            success: false,
            message: 'Cadastro disponível apenas com Supabase Auth configurado.',
          };
        }
        return mockAuth.register(payload);
      }
      return supabaseAuth.register(payload);
    },
  };
}
