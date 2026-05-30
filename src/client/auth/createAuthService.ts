import type { AuthService } from '../../shared/authService.js';
import { getSupabaseClient } from './supabaseAuth.js';
import { signInWithEmail, signUpWithEmail } from '../auth.js';
import { mockAuth } from '../services/mockAuth.js';

function createSupabaseAuthService(): AuthService {
  return {
    async login(email, pass) {
      const result = await signInWithEmail(email, pass);
      if (!result.ok) {
        return { success: false, message: result.message };
      }

      return {
        success: true,
        user: { email: email.trim() },
        message: result.message,
      };
    },

    async register(email, pass) {
      const result = await signUpWithEmail(email, pass);
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
        return mockAuth.login(email, pass);
      }
      return supabaseAuth.login(email, pass);
    },

    async register(email, pass) {
      if (!getSupabaseClient()) {
        return mockAuth.register(email, pass);
      }
      return supabaseAuth.register(email, pass);
    },
  };
}
