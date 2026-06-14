/**
 * @deprecated Use GameAuthService — reexport de compatibilidade.
 */
export {
  OAUTH_PENDING_KEY,
  clearOAuthRedirectPending,
  isOAuthRedirectPending,
  markOAuthRedirectPending,
} from '../services/auth/oauthPending.js';

export {
  bindGoogleLoginButton as bindLoginWithGoogle,
} from '../services/auth/GameAuthService.js';

export type { LoginWithGoogleOptions } from '../services/auth/GameAuthService.js';
