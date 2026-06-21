/** Views do fluxo de autenticação — camada screen React oficial. */
export type AuthView =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'profile-complete';

export type AuthScreenBootstrapOptions = {
  readonly onAuthenticated: (
    user: import('../../../shared/authService.js').AuthUser,
    options?: import('../../auth/authSessionBridge.js').AuthPostLoginOptions,
  ) => void | Promise<void>;
};
