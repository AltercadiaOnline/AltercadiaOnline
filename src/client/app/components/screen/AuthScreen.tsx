import type { ReactNode } from 'react';
import { useAuthScreen, useAuthScreenActions } from '../../hooks/useAuthScreen.js';

function AuthStatus({ message, isError }: { readonly message: string; readonly isError: boolean }) {
  if (!message) return null;
  return (
    <p
      className={`auth-status ${isError ? 'is-error' : 'is-success'}`}
      aria-live="polite"
    >
      {message}
    </p>
  );
}

function AuthField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function AuthScreen() {
  const state = useAuthScreen();
  const actions = useAuthScreenActions();
  const disabled = state.busy;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[960] flex items-center justify-center bg-[rgba(5,10,13,0.96)]"
      data-ui-surface="auth-screen"
      role="main"
      aria-label="Autenticação"
      aria-busy={disabled}
    >
      <div className="login-box vortex-panel auth-form mx-4 w-full max-w-md">
        <h1>ALTERCADIA.ONLINE</h1>

        {state.view === 'login' && (
          <section className="auth-panel">
            <AuthField label="Email">
              <input
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={state.email}
                readOnly={disabled}
                onChange={(event) => actions.setField('email', event.target.value)}
              />
            </AuthField>
            <AuthField label="Senha">
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••"
                value={state.password}
                readOnly={disabled}
                onChange={(event) => actions.setField('password', event.target.value)}
              />
            </AuthField>
            <div className="auth-actions">
              <button type="button" disabled={disabled} onClick={actions.handleLogin}>
                LOGIN
              </button>
              <button type="button" disabled={disabled} onClick={actions.goToRegister}>
                CADASTRAR
              </button>
            </div>
            <button
              type="button"
              className="auth-link-btn"
              disabled={disabled}
              onClick={actions.goToForgotPassword}
            >
              ESQUECI MINHA SENHA
            </button>
            <button
              type="button"
              className="auth-google-btn"
              disabled={disabled}
              onClick={actions.handleGoogleLogin}
            >
              ENTRAR COM GOOGLE
            </button>
          </section>
        )}

        {state.view === 'forgot-password' && (
          <section className="auth-panel">
            <h2 className="auth-panel-title">RECUPERAR SENHA</h2>
            <p className="auth-panel-hint">Enviaremos um link para redefinir sua senha.</p>
            <AuthField label="Email">
              <input
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={state.forgotEmail}
                readOnly={disabled}
                onChange={(event) => actions.setField('forgotEmail', event.target.value)}
              />
            </AuthField>
            <div className="auth-actions">
              <button type="button" disabled={disabled} onClick={actions.handleSendPasswordReset}>
                ENVIAR LINK
              </button>
              <button type="button" disabled={disabled} onClick={actions.goToLogin}>
                VOLTAR
              </button>
            </div>
          </section>
        )}

        {state.view === 'reset-password' && (
          <section className="auth-panel">
            <h2 className="auth-panel-title">NOVA SENHA</h2>
            <p className="auth-panel-hint">Defina uma nova senha para sua conta.</p>
            <AuthField label="Nova senha">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="••••••"
                value={state.resetPass}
                readOnly={disabled}
                onChange={(event) => actions.setField('resetPass', event.target.value)}
              />
            </AuthField>
            <AuthField label="Confirmar senha">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="••••••"
                value={state.resetConfirm}
                readOnly={disabled}
                onChange={(event) => actions.setField('resetConfirm', event.target.value)}
              />
            </AuthField>
            <div className="auth-actions">
              <button type="button" disabled={disabled} onClick={actions.handleApplyNewPassword}>
                SALVAR SENHA
              </button>
              <button type="button" disabled={disabled} onClick={actions.goToLogin}>
                VOLTAR
              </button>
            </div>
          </section>
        )}

        {state.view === 'profile-complete' && (
          <section className="auth-panel">
            <h2 className="auth-panel-title">COMPLETAR PERFIL</h2>
            <p className="auth-panel-hint">
              Informe sua data de nascimento para continuar (contas Google ou novas).
            </p>
            <AuthField label="Nome">
              <input
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                value={state.profileName}
                readOnly={disabled}
                onChange={(event) => actions.setField('profileName', event.target.value)}
              />
            </AuthField>
            <AuthField label="Data de nascimento">
              <input
                type="date"
                autoComplete="bday"
                value={state.profileBirth}
                readOnly={disabled}
                onChange={(event) => actions.setField('profileBirth', event.target.value)}
              />
            </AuthField>
            {state.showProfileGuardianConsent && (
              <label className="auth-field auth-consent-field">
                <span className="auth-consent-heading">Consentimento de Responsável</span>
                <span className="auth-consent-label">
                  <input
                    type="checkbox"
                    checked={state.profileGuardianConsent}
                    disabled={disabled}
                    onChange={(event) => actions.setField('profileGuardianConsent', event.target.checked)}
                  />
                  Declaro que tenho permissão dos meus pais ou responsáveis para jogar e para o
                  processamento dos meus dados.
                </span>
              </label>
            )}
            <div className="auth-actions">
              <button type="button" disabled={disabled} onClick={actions.handleProfileComplete}>
                CONTINUAR
              </button>
              <button type="button" disabled={disabled} onClick={actions.handleProfileCancel}>
                SAIR
              </button>
            </div>
          </section>
        )}

        {state.view === 'register' && (
          <section className="auth-panel">
            <h2 className="auth-panel-title">CRIAR CONTA</h2>
            <AuthField label="Nome">
              <input
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                value={state.regName}
                readOnly={disabled}
                onChange={(event) => actions.setField('regName', event.target.value)}
              />
            </AuthField>
            <AuthField label="Data de nascimento">
              <input
                type="date"
                required
                autoComplete="bday"
                value={state.regBirth}
                readOnly={disabled}
                onChange={(event) => actions.setField('regBirth', event.target.value)}
              />
            </AuthField>
            {state.showGuardianConsent && (
              <label className="auth-field auth-consent-field">
                <span className="auth-consent-heading">Consentimento de Responsável</span>
                <span className="auth-consent-label">
                  <input
                    type="checkbox"
                    checked={state.guardianConsent}
                    disabled={disabled}
                    onChange={(event) => actions.setField('guardianConsent', event.target.checked)}
                  />
                  Declaro que tenho permissão dos meus pais ou responsáveis para jogar e para o
                  processamento dos meus dados.
                </span>
              </label>
            )}
            <AuthField label="Email">
              <input
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={state.regEmail}
                readOnly={disabled}
                onChange={(event) => actions.setField('regEmail', event.target.value)}
              />
            </AuthField>
            <AuthField label="Senha">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="••••••"
                value={state.regPass}
                readOnly={disabled}
                onChange={(event) => actions.setField('regPass', event.target.value)}
              />
            </AuthField>
            <AuthField label="Confirmar senha">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="••••••"
                value={state.regConfirm}
                readOnly={disabled}
                onChange={(event) => actions.setField('regConfirm', event.target.value)}
              />
            </AuthField>
            <div className="auth-actions">
              <button type="button" disabled={disabled} onClick={actions.handleRegister}>
                CRIAR CONTA
              </button>
              <button type="button" disabled={disabled} onClick={actions.goToLogin}>
                VOLTAR
              </button>
            </div>
            <button
              type="button"
              className="auth-link-btn"
              disabled={disabled}
              onClick={actions.handleResendConfirmation}
            >
              Reenviar email de confirmação
            </button>
            <button
              type="button"
              className="auth-google-btn"
              disabled={disabled}
              onClick={actions.handleGoogleLogin}
            >
              CADASTRAR COM GOOGLE
            </button>
          </section>
        )}

        <AuthStatus message={state.statusMessage} isError={state.statusIsError} />

        {state.authBootstrapPending && !state.statusMessage ? (
          <p className="auth-status" aria-live="polite">
            Preparando autenticação…
          </p>
        ) : null}

        {state.bootstrapFatalVisible ? (
          <div className="bootstrap-fatal-overlay mt-4 flex flex-col gap-3">
            <p className="bootstrap-fatal-overlay__message m-0">
              Falha ao iniciar o cliente. Verifique a conexão e tente novamente.
            </p>
            <button
              type="button"
              className="bootstrap-fatal-overlay__retry"
              onClick={actions.retryBootstrap}
            >
              Tentar novamente
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
