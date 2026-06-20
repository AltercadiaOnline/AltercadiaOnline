export type AuthUser = {
  email: string;
  id?: string;
  fullName?: string;
};

export type AuthLoginResult = {
  success: boolean;
  user?: AuthUser;
  message?: string;
};

export type AuthRegisterPayload = {
  email: string;
  password: string;
  fullName: string;
  birthDate: string;
  /** Obrigatório quando birthDate indica menor de 18 anos. */
  parentalConsent?: boolean;
};

export type AuthRegisterResult = {
  success: boolean;
  message?: string;
  /** Conta criada — jogador deve confirmar email antes de entrar. */
  needsEmailConfirmation?: boolean;
};

/** Contrato de autenticação usado pelo cliente e futuros módulos do jogo. */
export interface AuthService {
  login(email: string, pass: string): Promise<AuthLoginResult>;
  register(payload: AuthRegisterPayload): Promise<AuthRegisterResult>;
}
