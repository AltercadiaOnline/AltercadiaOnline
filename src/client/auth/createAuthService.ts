import type { AuthService } from '../../shared/authService.js';
import { getSupabaseClient } from './supabaseAuth.js';
import { signInWithEmail, signUpWithEmail } from '../auth.js';
import { resolveAccountKey } from '../services/localSessionStore.js';
import { logAuthApiAttempt, logAuthApiResult } from './authDebug.js';
import {
  USER_AUTH_NOT_CONFIGURED,
  USER_REGISTER_UNAVAILABLE,
} from '../../shared/brand.js';

/** Autenticação exclusivamente via Supabase (online). */
export function createAuthService(): AuthService {
  return {
    async login(email, pass) {
      if (!getSupabaseClient()) {
        logAuthApiResult('login', 'error', {
          message: 'Supabase não configurado.',
        });
        return {
          success: false,
          message: USER_AUTH_NOT_CONFIGURED,
        };
      }
      logAuthApiAttempt('login', { provider: 'supabase', hasClient: true });
      const result = await signInWithEmail(email, pass);
      if (!result.ok) {
        logAuthApiResult('login', 'error', { message: result.message });
        return { success: false, message: result.message };
      }

      const trimmedEmail = email.trim();
      const accountKey = result.userId ?? resolveAccountKey({ email: trimmedEmail });

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
      if (!getSupabaseClient()) {
        return {
          success: false,
          message: USER_REGISTER_UNAVAILABLE,
        };
      }
      logAuthApiAttempt('register', {
        provider: 'supabase',
        hasClient: true,
        email: payload.email.trim(),
      });
      const result = await signUpWithEmail(payload.email, payload.password, {
        fullName: payload.fullName,
        birthDate: payload.birthDate,
        parentalConsent: payload.parentalConsent === true,
      });
      logAuthApiResult(result.ok ? 'register' : 'register', result.ok ? 'success' : 'error', {
        message: result.message,
      });
      return {
        success: result.ok,
        message: result.message,
        ...(result.needsEmailConfirmation ? { needsEmailConfirmation: true } : {}),
      };
    },
  };
}
