import type { AuthService } from '../../shared/authService.js';
import { getSupabaseClient, getUser } from './supabaseAuth.js';
import { signInWithEmail, signUpWithEmail } from '../auth.js';
import { resolveAccountKey } from '../services/localSessionStore.js';
import { loginLocalDevAccount } from './localDevAuth.js';
import { mockAuth } from '../services/mockAuth.js';

function createSupabaseAuthService(): AuthService {
  return {
    async login(email, pass) {
      const result = await signInWithEmail(email, pass);
      if (!result.ok) {
        return { success: false, message: result.message };
      }

      const trimmedEmail = email.trim();
      const supabaseUser = await getUser();
      const accountKey = supabaseUser?.id ?? resolveAccountKey({ email: trimmedEmail });

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
      const result = await signUpWithEmail(payload.email, payload.password);
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
        const result = await loginLocalDevAccount(email, pass);
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
        return mockAuth.register(payload);
      }
      return supabaseAuth.register(payload);
    },
  };
}
