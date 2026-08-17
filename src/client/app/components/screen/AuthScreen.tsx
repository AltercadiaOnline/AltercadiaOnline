/** HUD de login teste (Cyberrang). Backup: AuthScreen.legacy.tsx. Flag: AUTH_HUD_TEST_LAYOUT. */
import { useState, type ReactNode } from 'react';
import { useAuthScreen, useAuthScreenActions } from '../../hooks/useAuthScreen.js';
import { useLiveLeaderboard } from '../../hooks/useLiveLeaderboard.js';
import type { LeaderboardBoardId } from '../../../../shared/leaderboard/leaderboardTypes.js';
import { CLASS_CATALOG, type ClassType } from '../../../../shared/types/classes.js';
import { AUTH_COMMUNITY_LINKS } from './authHudTestFlag.js';

const AUTH_RANK_TABS: ReadonlyArray<{ readonly id: LeaderboardBoardId; readonly label: string }> = [
  { id: 'level_global', label: 'Level' },
  { id: 'level_class', label: 'Classe' },
  { id: 'moveset', label: 'Moveset' },
  { id: 'pvp_ranked', label: 'PvP' },
  { id: 'pve', label: 'PvE' },
];

const CLASS_TAB_IDS = Object.keys(CLASS_CATALOG) as ClassType[];

function LiveRankPanel() {
  const [boardId, setBoardId] = useState<LeaderboardBoardId>('level_global');
  const [classId, setClassId] = useState<ClassType>('IMPETUS');
  const { snapshot, loading } = useLiveLeaderboard(boardId, {
    ...(boardId === 'level_class' ? { classId } : {}),
  });
  const title = snapshot?.title ?? 'Ranking';
  const scoreHeader = snapshot?.scoreHeader ?? 'Score';
  const entries = snapshot?.entries ?? [];

  return (
    <section className="auth-hud-test__rank" id="auth-rank-panel">
      <h2>{title}</h2>
      <nav className="auth-hud-test__rank-tabs" aria-label="Categorias de ranking">
        {AUTH_RANK_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`auth-hud-test__rank-tab${boardId === tab.id ? ' is-active' : ''}`}
            aria-pressed={boardId === tab.id}
            onClick={() => setBoardId(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {boardId === 'level_class' ? (
        <nav className="auth-hud-test__rank-classes" aria-label="Classe">
          {CLASS_TAB_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`auth-hud-test__rank-class${classId === id ? ' is-active' : ''}`}
              aria-pressed={classId === id}
              onClick={() => setClassId(id)}
            >
              {id}
            </button>
          ))}
        </nav>
      ) : null}
      <div className="auth-hud-test__rank-head">
        <span>Rank</span>
        <span>Jogador</span>
        <span>{scoreHeader}</span>
      </div>
      <ol className="auth-hud-test__rank-list">
        {entries.map((entry) => (
          <li
            key={`${entry.rank}-${entry.displayName}`}
            className={entry.rank === 1 ? 'is-lead' : undefined}
            data-rank={entry.rank}
          >
            <span className="auth-hud-test__rank-n">{entry.rank}</span>
            <span className="auth-hud-test__rank-avatar" aria-hidden="true" />
            <span className="auth-hud-test__rank-name">{entry.displayName}</span>
            <span className="auth-hud-test__rank-pts">{entry.scoreLabel}</span>
          </li>
        ))}
      </ol>
      {entries.length === 0 ? (
        <p className="auth-hud-test__rank-note">
          {loading ? 'Carregando ranking ao vivo…' : 'Sem registros nesta board ainda.'}
        </p>
      ) : (
        <p className="auth-hud-test__rank-note">Ao vivo — atualiza a cada 4s</p>
      )}
    </section>
  );
}

function AuthStatus({ message, isError }: { readonly message: string; readonly isError: boolean }) {
  if (!message) return null;
  return (
    <p
      className={`auth-hud-test__status ${isError ? 'is-error' : 'is-success'}`}
      aria-live="polite"
    >
      {message}
    </p>
  );
}

function GlassField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <label className="auth-hud-test__field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function AuthScreen() {
  const state = useAuthScreen();
  const actions = useAuthScreenActions();
  const disabled = state.busy;
  const authBlocked = disabled || state.authBootstrapPending;
  const [showPassword, setShowPassword] = useState(false);

  const panelTitle =
    state.view === 'login' ? 'Login'
    : state.view === 'register' ? 'Cadastrar'
    : state.view === 'forgot-password' ? 'Recuperar senha'
    : state.view === 'reset-password' ? 'Nova senha'
    : 'Completar perfil';

  return (
    <div
      className="auth-screen-root auth-hud-test pointer-events-auto fixed inset-0 z-[960]"
      data-ui-surface="auth-screen"
      data-auth-hud="cyberrang-test"
      role="main"
      aria-label="Autenticação"
      aria-busy={disabled}
    >
      <header className="auth-hud-test__top">
        <div className="auth-hud-test__brand-block">
          <h1 className="auth-hud-test__brand">ALTERCADIA</h1>
          <p className="auth-hud-test__tagline">RPG BATTLE ONLINE</p>
        </div>
        <nav className="auth-hud-test__nav" aria-label="Login">
          <button type="button" className="auth-hud-test__nav-link" onClick={actions.goToLogin}>
            PRINTS
          </button>
          <a className="auth-hud-test__nav-link" href="#auth-rank-panel">
            RANKING
          </a>
          <a className="auth-hud-test__nav-search" href="#auth-rank-panel" aria-label="Buscar ranking">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M15.5 15.5 21 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </a>
          <button
            type="button"
            className="auth-hud-test__nav-signup"
            disabled={disabled}
            onClick={actions.goToRegister}
          >
            CADASTRAR
          </button>
        </nav>
      </header>

      <div className="auth-hud-test__body">
        <section className="auth-hud-test__login" aria-label={panelTitle}>
          <h2 className="auth-hud-test__login-title">{panelTitle}</h2>

          {state.view === 'login' ? (
            <>
              <GlassField label="Login">
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={state.email}
                  readOnly={disabled}
                  onChange={(event) => actions.setField('email', event.target.value)}
                />
              </GlassField>
              <div className="auth-hud-test__pass-block">
                <div className="auth-hud-test__pass-row">
                  <span>Password</span>
                  <button
                    type="button"
                    className="auth-hud-test__forgot"
                    disabled={disabled}
                    onClick={actions.goToForgotPassword}
                  >
                    Forgot your password?
                  </button>
                </div>
                <span className="auth-hud-test__secret">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={state.password}
                    readOnly={disabled}
                    onChange={(event) => actions.setField('password', event.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-hud-test__eye"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path
                        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                  </button>
                </span>
              </div>
              <button
                type="button"
                className="auth-hud-test__submit"
                disabled={authBlocked}
                onClick={actions.handleLogin}
              >
                {authBlocked ? '…' : 'Login'}
              </button>
              <button
                type="button"
                className="auth-hud-test__google"
                disabled={authBlocked}
                onClick={actions.handleGoogleLogin}
              >
                Entrar com Google
              </button>
            </>
          ) : null}

          {state.view === 'forgot-password' ? (
            <>
              <p className="auth-hud-test__hint">Enviaremos um link para redefinir sua senha.</p>
              <GlassField label="Email">
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={state.forgotEmail}
                  readOnly={disabled}
                  onChange={(event) => actions.setField('forgotEmail', event.target.value)}
                />
              </GlassField>
              <button
                type="button"
                className="auth-hud-test__submit"
                disabled={disabled}
                onClick={actions.handleSendPasswordReset}
              >
                Enviar link
              </button>
              <button type="button" className="auth-hud-test__ghost" disabled={disabled} onClick={actions.goToLogin}>
                Voltar
              </button>
            </>
          ) : null}

          {state.view === 'reset-password' ? (
            <>
              <GlassField label="Nova senha">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={state.resetPass}
                  readOnly={disabled}
                  onChange={(event) => actions.setField('resetPass', event.target.value)}
                />
              </GlassField>
              <GlassField label="Confirmar senha">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={state.resetConfirm}
                  readOnly={disabled}
                  onChange={(event) => actions.setField('resetConfirm', event.target.value)}
                />
              </GlassField>
              <button
                type="button"
                className="auth-hud-test__submit"
                disabled={disabled}
                onClick={actions.handleApplyNewPassword}
              >
                Salvar senha
              </button>
              <button type="button" className="auth-hud-test__ghost" disabled={disabled} onClick={actions.goToLogin}>
                Voltar
              </button>
            </>
          ) : null}

          {state.view === 'profile-complete' ? (
            <>
              <p className="auth-hud-test__hint">
                Informe sua data de nascimento para continuar.
              </p>
              <GlassField label="Nome">
                <input
                  type="text"
                  autoComplete="name"
                  value={state.profileName}
                  readOnly={disabled}
                  onChange={(event) => actions.setField('profileName', event.target.value)}
                />
              </GlassField>
              <GlassField label="Data de nascimento">
                <input
                  type="date"
                  autoComplete="bday"
                  value={state.profileBirth}
                  readOnly={disabled}
                  onChange={(event) => actions.setField('profileBirth', event.target.value)}
                />
              </GlassField>
              {state.showProfileGuardianConsent ? (
                <label className="auth-hud-test__consent">
                  <input
                    type="checkbox"
                    checked={state.profileGuardianConsent}
                    disabled={disabled}
                    onChange={(event) => actions.setField('profileGuardianConsent', event.target.checked)}
                  />
                  Tenho permissão dos responsáveis para jogar.
                </label>
              ) : null}
              <button
                type="button"
                className="auth-hud-test__submit"
                disabled={disabled}
                onClick={actions.handleProfileComplete}
              >
                Continuar
              </button>
              <button
                type="button"
                className="auth-hud-test__ghost"
                disabled={disabled}
                onClick={actions.handleProfileCancel}
              >
                Sair
              </button>
            </>
          ) : null}

          {state.view === 'register' ? (
            <>
              <GlassField label="Nome">
                <input
                  type="text"
                  autoComplete="name"
                  value={state.regName}
                  readOnly={disabled}
                  onChange={(event) => actions.setField('regName', event.target.value)}
                />
              </GlassField>
              <GlassField label="Data de nascimento">
                <input
                  type="date"
                  required
                  autoComplete="bday"
                  value={state.regBirth}
                  readOnly={disabled}
                  onChange={(event) => actions.setField('regBirth', event.target.value)}
                />
              </GlassField>
              {state.showGuardianConsent ? (
                <label className="auth-hud-test__consent">
                  <input
                    type="checkbox"
                    checked={state.guardianConsent}
                    disabled={disabled}
                    onChange={(event) => actions.setField('guardianConsent', event.target.checked)}
                  />
                  Tenho permissão dos responsáveis para jogar.
                </label>
              ) : null}
              <GlassField label="Email">
                <input
                  type="email"
                  autoComplete="email"
                  value={state.regEmail}
                  readOnly={disabled}
                  onChange={(event) => actions.setField('regEmail', event.target.value)}
                />
              </GlassField>
              <GlassField label="Senha">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={state.regPass}
                  readOnly={disabled}
                  onChange={(event) => actions.setField('regPass', event.target.value)}
                />
              </GlassField>
              <GlassField label="Confirmar senha">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={state.regConfirm}
                  readOnly={disabled}
                  onChange={(event) => actions.setField('regConfirm', event.target.value)}
                />
              </GlassField>
              <button
                type="button"
                className="auth-hud-test__submit"
                disabled={authBlocked}
                onClick={actions.handleRegister}
              >
                Criar conta
              </button>
              <button type="button" className="auth-hud-test__ghost" disabled={disabled} onClick={actions.goToLogin}>
                Voltar
              </button>
              <button
                type="button"
                className="auth-hud-test__google"
                disabled={authBlocked}
                onClick={actions.handleGoogleLogin}
              >
                Cadastrar com Google
              </button>
              <button
                type="button"
                className="auth-hud-test__forgot"
                disabled={disabled}
                onClick={actions.handleResendConfirmation}
              >
                Reenviar email de confirmação
              </button>
            </>
          ) : null}

          <AuthStatus message={state.statusMessage} isError={state.statusIsError} />
          {state.authBootstrapPending && !state.statusMessage ? (
            <p className="auth-hud-test__status">Preparando autenticação…</p>
          ) : null}
          {!state.loginActionsReady && !state.authBootstrapPending && !state.statusMessage ? (
            <p className="auth-hud-test__status">Iniciando cliente… aguarde ou clique em LOGIN.</p>
          ) : null}
          {state.bootstrapFatalVisible ? (
            <button type="button" className="auth-hud-test__ghost" onClick={actions.retryBootstrap}>
              Tentar novamente
            </button>
          ) : null}
        </section>

        <aside className="auth-hud-test__rail" aria-label="Comunidade e ranking">
          <div className="auth-hud-test__social">
            <a
              className="auth-hud-test__discord"
              href={AUTH_COMMUNITY_LINKS.discord}
              target="_blank"
              rel="noreferrer"
            >
              Join Our Discord
            </a>
            <a
              className="auth-hud-test__qr"
              href={AUTH_COMMUNITY_LINKS.forum}
              target="_blank"
              rel="noreferrer"
              aria-label="Fórum Altercadia"
              title="Fórum"
            >
              <span className="auth-hud-test__qr-grid" aria-hidden="true" />
              <span className="auth-hud-test__qr-label">FORUM</span>
            </a>
          </div>

          <LiveRankPanel />
        </aside>
      </div>
    </div>
  );
}
