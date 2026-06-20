import type { AuthService } from '../../shared/authService.js';
import { isSupabaseReady, signInWithGoogleOAuth } from '../auth/supabaseAuth.js';

export type AuthFormOptions = {
  authService: AuthService;
  onAuthenticated: () => void;
};

export class AuthForm {
  private readonly root: HTMLElement;
  private readonly emailInput: HTMLInputElement;
  private readonly passwordInput: HTMLInputElement;
  private readonly confirmInput: HTMLInputElement;
  private readonly statusEl: HTMLParagraphElement;
  private readonly signInBtn: HTMLButtonElement;
  private readonly signUpBtn: HTMLButtonElement;
  private readonly googleBtn: HTMLButtonElement;
  private readonly options: AuthFormOptions;
  private busy = false;

  constructor(root: HTMLElement, options: AuthFormOptions) {
    this.root = root;
    this.options = options;
    this.root.classList.add('auth-form');

    this.root.innerHTML = `
      <h1>ALTERCADIA</h1>
      <label class="auth-field">
        <span>Email</span>
        <input id="auth-email" type="email" autocomplete="email" required />
      </label>
      <label class="auth-field">
        <span>Senha</span>
        <input id="auth-password" type="password" autocomplete="current-password" required />
      </label>
      <label class="auth-field">
        <span>Confirmar senha</span>
        <input id="auth-confirm" type="password" autocomplete="new-password" />
      </label>
      <p id="auth-status" class="auth-status" aria-live="polite"></p>
      <div class="auth-actions">
        <button id="btn-auth-sign-in" type="button">Entrar</button>
        <button id="btn-auth-sign-up" type="button">Cadastrar</button>
      </div>
      <button id="btn-google" type="button">Login com Google</button>
    `;

    this.emailInput = this.requireInput('#auth-email');
    this.passwordInput = this.requireInput('#auth-password');
    this.confirmInput = this.requireInput('#auth-confirm');
    this.statusEl = this.requireElement('#auth-status', HTMLParagraphElement);
    this.signInBtn = this.requireElement('#btn-auth-sign-in', HTMLButtonElement);
    this.signUpBtn = this.requireElement('#btn-auth-sign-up', HTMLButtonElement);
    this.googleBtn = this.requireElement('#btn-google', HTMLButtonElement);

    this.signInBtn.addEventListener('click', () => {
      void this.handleSignIn();
    });
    this.signUpBtn.addEventListener('click', () => {
      void this.handleSignUp();
    });
    this.googleBtn.addEventListener('click', () => {
      void this.handleGoogleLogin();
    });

    this.root.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      void this.handleSignIn();
    });
  }

  private requireInput(selector: string): HTMLInputElement {
    return this.requireElement(selector, HTMLInputElement);
  }

  private requireElement<T extends HTMLElement>(selector: string, ctor: new (...args: never[]) => T): T {
    const element = this.root.querySelector(selector);
    if (!(element instanceof ctor)) {
      throw new Error(`[AuthForm] Elemento ausente: ${selector}`);
    }
    return element;
  }

  private setStatus(message: string, isError: boolean): void {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle('is-error', isError);
    this.statusEl.classList.toggle('is-success', !isError && message.length > 0);
  }

  private setBusy(next: boolean): void {
    this.busy = next;
    this.signInBtn.disabled = next;
    this.signUpBtn.disabled = next;
    this.googleBtn.disabled = next;
  }

  private validateSignUpPasswords(): string | null {
    if (this.passwordInput.value !== this.confirmInput.value) {
      return 'As senhas não coincidem.';
    }

    if (this.passwordInput.value.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }

    return null;
  }

  private async handleSignIn(): Promise<void> {
    if (this.busy) return;

    this.setBusy(true);
    this.setStatus('Entrando…', false);

    const result = await this.options.authService.login(
      this.emailInput.value,
      this.passwordInput.value,
    );
    this.setBusy(false);

    if (!result.success) {
      this.setStatus(result.message ?? 'Falha no login.', true);
      return;
    }

    this.setStatus(result.message ?? 'Login realizado.', false);
    this.options.onAuthenticated();
  }

  private async handleSignUp(): Promise<void> {
    if (this.busy) return;

    const passwordError = this.validateSignUpPasswords();
    if (passwordError) {
      this.setStatus(passwordError, true);
      return;
    }

    this.setBusy(true);
    this.setStatus('Enviando cadastro…', false);

    const result = await this.options.authService.register({
      fullName: '',
      birthDate: '',
      email: this.emailInput.value,
      password: this.passwordInput.value,
    });
    this.setBusy(false);

    if (!result.success) {
      this.setStatus(result.message ?? 'Falha no cadastro.', true);
      return;
    }

    this.setStatus(result.message ?? 'Cadastro realizado.', false);
    this.confirmInput.value = '';

    if (result.message?.includes('Verifique seu email')) {
      return;
    }

    this.options.onAuthenticated();
  }

  private async handleGoogleLogin(): Promise<void> {
    if (this.busy) return;

    if (!isSupabaseReady()) {
      this.setStatus('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY.', true);
      return;
    }

    this.setBusy(true);
    this.setStatus('Redirecionando para Google…', false);
    await signInWithGoogleOAuth();
    this.setBusy(false);
  }
}

export function mountAuthForm(root: HTMLElement, options: AuthFormOptions): AuthForm {
  return new AuthForm(root, options);
}
