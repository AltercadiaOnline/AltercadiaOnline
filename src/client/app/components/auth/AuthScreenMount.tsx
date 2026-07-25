// @ts-nocheck
import { useEffect, useState } from 'react';
import { ADULT_AGE_YEARS, computeAgeYears } from '../../../auth.js';
import { getAuthScreenController } from '../../auth/authScreenControllerRegistry.js';
import { getAppScreenBridge } from '../../bridge/appScreenBridge.js';
import { getAuthBridge } from '../../bridge/authBridge.js';
import { AuthActions, AuthButton, AuthField, AuthPanelHint, AuthPanelTitle, AuthStatus, GuardianConsentField, } from './AuthUi.js';
function readScreenSnapshot() {
    return getAppScreenBridge().snapshot();
}
function readAuthSnapshot() {
    return getAuthBridge().snapshot();
}
function isMinorBirthDate(birthDate) {
    const age = computeAgeYears(birthDate);
    return age !== null && age < ADULT_AGE_YEARS;
}
function useAuthController() {
    return getAuthScreenController();
}
export function AuthScreenMount() {
    const [screen, setScreen] = useState(() => readScreenSnapshot());
    const [auth, setAuth] = useState(() => readAuthSnapshot());
    const controller = useAuthController();
    useEffect(() => getAppScreenBridge().subscribe(setScreen), []);
    useEffect(() => getAuthBridge().subscribe(setAuth), []);
    if (screen.activeScreen !== 'login-screen' || !auth.controllerReady || !controller) {
        return null;
    }
    const { busy, statusMessage, statusTone, forms } = auth;
    const view = screen.authView;
    const patch = (patchForms) => {
        getAuthBridge().patchForms(patchForms);
    };
    const panelFont = { fontFamily: 'Georgia, "Times New Roman", serif' };
    return (<div className="pointer-events-auto fixed inset-0 z-[110] flex items-center justify-center bg-[radial-gradient(circle,#1a1a2e,#050a0d)]" aria-busy={busy}>
      <div className="flex w-[min(360px,90vw)] flex-col gap-4 border-2 border-[#5e4a30] bg-[rgba(20,15,10,0.9)] px-6 py-8 text-[#d4b483]">
        <h1 className="text-center text-[1.4rem] tracking-[0.2em]" style={panelFont}>
          ALTERCADIA.ONLINE
        </h1>

        {view === 'login' ? (<section className="flex flex-col gap-4 text-left">
            <AuthField id="react-email-input" label="Email" type="email" autoComplete="email" placeholder="seu@email.com" value={forms.email} disabled={busy} onChange={(email) => patch({ email })}/>
            <AuthField id="react-pass-input" label="Senha" type="password" autoComplete="current-password" placeholder="••••••" value={forms.password} disabled={busy} onChange={(password) => patch({ password })}/>
            <AuthActions>
              <AuthButton disabled={busy} onClick={() => { void controller.login(); }}>
                LOGIN
              </AuthButton>
              <AuthButton disabled={busy} onClick={() => controller.goToRegister()}>
                CADASTRAR
              </AuthButton>
            </AuthActions>
            <AuthButton variant="link" disabled={busy} onClick={() => controller.goToForgotPassword()}>
              ESQUECI MINHA SENHA
            </AuthButton>
            <AuthButton variant="google" disabled={busy} onClick={() => { void controller.googleLogin(); }}>
              ENTRAR COM GOOGLE
            </AuthButton>
          </section>) : null}

        {view === 'forgot-password' ? (<section className="flex flex-col gap-4 text-left">
            <AuthPanelTitle>RECUPERAR SENHA</AuthPanelTitle>
            <AuthPanelHint>Enviaremos um link para redefinir sua senha.</AuthPanelHint>
            <AuthField id="react-forgot-email-input" label="Email" type="email" autoComplete="email" placeholder="seu@email.com" value={forms.forgotEmail} disabled={busy} onChange={(forgotEmail) => patch({ forgotEmail })}/>
            <AuthActions>
              <AuthButton disabled={busy} onClick={() => { void controller.sendPasswordReset(); }}>
                ENVIAR LINK
              </AuthButton>
              <AuthButton disabled={busy} onClick={() => controller.goToLogin()}>
                VOLTAR
              </AuthButton>
            </AuthActions>
          </section>) : null}

        {view === 'reset-password' ? (<section className="flex flex-col gap-4 text-left">
            <AuthPanelTitle>NOVA SENHA</AuthPanelTitle>
            <AuthPanelHint>Defina uma nova senha para sua conta.</AuthPanelHint>
            <AuthField id="react-reset-pass-input" label="Nova senha" type="password" autoComplete="new-password" placeholder="••••••" value={forms.resetPass} disabled={busy} onChange={(resetPass) => patch({ resetPass })}/>
            <AuthField id="react-reset-confirm-input" label="Confirmar senha" type="password" autoComplete="new-password" placeholder="••••••" value={forms.resetConfirm} disabled={busy} onChange={(resetConfirm) => patch({ resetConfirm })}/>
            <AuthActions>
              <AuthButton disabled={busy} onClick={() => { void controller.applyNewPassword(); }}>
                SALVAR SENHA
              </AuthButton>
              <AuthButton disabled={busy} onClick={() => controller.goToLogin()}>
                VOLTAR
              </AuthButton>
            </AuthActions>
          </section>) : null}

        {view === 'profile-complete' ? (<section className="flex flex-col gap-4 text-left">
            <AuthPanelTitle>COMPLETAR PERFIL</AuthPanelTitle>
            <AuthPanelHint>
              Informe sua data de nascimento para continuar (contas Google ou novas).
            </AuthPanelHint>
            <AuthField id="react-profile-name-input" label="Nome" autoComplete="name" placeholder="Seu nome" value={forms.profileName} disabled={busy} onChange={(profileName) => patch({ profileName })}/>
            <AuthField id="react-profile-birth-input" label="Data de nascimento" type="date" autoComplete="bday" value={forms.profileBirth} disabled={busy} onChange={(profileBirth) => {
                patch({
                    profileBirth,
                    profileGuardianConsent: isMinorBirthDate(profileBirth)
                        ? forms.profileGuardianConsent
                        : false,
                });
            }}/>
            <GuardianConsentField visible={isMinorBirthDate(forms.profileBirth)} checked={forms.profileGuardianConsent} disabled={busy} onChange={(profileGuardianConsent) => patch({ profileGuardianConsent })}/>
            <AuthActions>
              <AuthButton disabled={busy} onClick={() => { void controller.submitProfileComplete(); }}>
                CONTINUAR
              </AuthButton>
              <AuthButton disabled={busy} onClick={() => controller.cancelProfileComplete()}>
                SAIR
              </AuthButton>
            </AuthActions>
          </section>) : null}

        {view === 'register' ? (<section className="flex flex-col gap-4 text-left">
            <AuthPanelTitle>CRIAR CONTA</AuthPanelTitle>
            <AuthField id="react-reg-name-input" label="Nome" autoComplete="name" placeholder="Seu nome" value={forms.regName} disabled={busy} onChange={(regName) => patch({ regName })}/>
            <AuthField id="react-reg-birth-input" label="Data de nascimento" type="date" autoComplete="bday" value={forms.regBirth} disabled={busy} onChange={(regBirth) => {
                patch({
                    regBirth,
                    regGuardianConsent: isMinorBirthDate(regBirth) ? forms.regGuardianConsent : false,
                });
            }}/>
            <GuardianConsentField visible={isMinorBirthDate(forms.regBirth)} checked={forms.regGuardianConsent} disabled={busy} onChange={(regGuardianConsent) => patch({ regGuardianConsent })}/>
            <AuthField id="react-reg-email-input" label="Email" type="email" autoComplete="email" placeholder="seu@email.com" value={forms.regEmail} disabled={busy} onChange={(regEmail) => patch({ regEmail })}/>
            <AuthField id="react-reg-pass-input" label="Senha" type="password" autoComplete="new-password" placeholder="••••••" value={forms.regPass} disabled={busy} onChange={(regPass) => patch({ regPass })}/>
            <AuthField id="react-reg-confirm-input" label="Confirmar senha" type="password" autoComplete="new-password" placeholder="••••••" value={forms.regConfirm} disabled={busy} onChange={(regConfirm) => patch({ regConfirm })}/>
            <AuthActions>
              <AuthButton disabled={busy} onClick={() => { void controller.register(); }}>
                CRIAR CONTA
              </AuthButton>
              <AuthButton disabled={busy} onClick={() => controller.goToLogin()}>
                VOLTAR
              </AuthButton>
            </AuthActions>
            <AuthButton variant="link" disabled={busy} onClick={() => { void controller.resendConfirmation(); }}>
              Reenviar email de confirmação
            </AuthButton>
            <AuthButton variant="google" disabled={busy} onClick={() => { void controller.googleLogin(); }}>
              CADASTRAR COM GOOGLE
            </AuthButton>
          </section>) : null}

        <AuthStatus message={statusMessage} tone={statusTone}/>

        {auth.bootstrapRetryVisible ? (<AuthButton variant="link" onClick={() => getAuthBridge().invokeBootstrapRetry()}>
            Tentar novamente
          </AuthButton>) : null}
      </div>
    </div>);
}
