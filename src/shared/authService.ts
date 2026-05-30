export type AuthUser = {
  email: string;
  id?: string;
};

export type AuthLoginResult = {
  success: boolean;
  user?: AuthUser;
  message?: string;
};

export type AuthRegisterResult = {
  success: boolean;
  message?: string;
};

/** Contrato de autenticação usado pelo cliente e futuros módulos do jogo. */
export interface AuthService {
  login(email: string, pass: string): Promise<AuthLoginResult>;
  register(email: string, pass: string): Promise<AuthRegisterResult>;
}
