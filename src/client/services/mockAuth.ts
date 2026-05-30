import type { AuthService } from '../../shared/authService.js';
import { loginLocalUser, registerLocalUser } from './localAuthStore.js';

export const mockAuth: AuthService = {
  async login(email, pass) {
    const result = loginLocalUser(email, pass);
    if (!result.ok || !result.user) {
      return { success: false, message: result.message };
    }

    return {
      success: true,
      user: result.user,
      message: result.message,
    };
  },

  async register(email, pass) {
    const result = registerLocalUser(email, pass);
    return {
      success: result.ok,
      message: result.message,
    };
  },
};
