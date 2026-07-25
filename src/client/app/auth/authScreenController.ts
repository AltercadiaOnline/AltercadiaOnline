// @ts-nocheck
import { applyPasswordReset, requestPasswordReset, resendEmailConfirmation } from '../../auth.js';
import { ADULT_AGE_YEARS, computeAgeYears, isAtLeastAge, } from '../../auth.js';
import { parseBirthDateIso } from '../../../shared/auth/accountAgePolicy.js';
import { logAuthApiAttempt, logAuthApiResult, } from '../../auth/authDebug.js';
import { USER_EMAIL_CONFIRM_UNAVAILABLE, USER_GOOGLE_LOGIN_UNAVAILABLE, USER_GOOGLE_REDIRECT, USER_PASSWORD_RESET_UNAVAILABLE, } from '../../../shared/brand.js';
import { clearAllOAuthFlags, clearEmailCredentialAuthInFlight, markEmailCredentialAuthInFlight, suppressAuthSessionSideEffects, } from '../../services/auth/oauthPending.js';
import { hidePlayerInitLoading, showPlayerInitLoading } from '../../auth/playerInitLoading.js';
import { AuthOperationTimeoutError } from '../../auth/authDeadline.js';
import { resetGameStoreState } from '../../state/GameStore.js';
import { loginWithEmailForServer, registerAccount, startGoogleOAuth, } from '../../services/auth/GameAuthService.js';
import { clearPasswordRecoveryUrl, clearLocalSupabaseSession, isPasswordRecoverySession, isSupabaseReady, subscribeAuthStateChange, getUser, } from '../../auth/supabaseAuth.js';
import { updateUserProfileMetadata } from '../../auth/profileMetadata.js';
import { showAuthView } from '../../services/authFlow.js';
import { getAuthBridge } from '../bridge/authBridge.js';
import { registerAuthScreenController, } from './authScreenControllerRegistry.js';
const MIN_PASSWORD_LENGTH = 6;
function isMinorBirthDate(birthDate) {
    const age = computeAgeYears(birthDate);
    return age !== null && !isAtLeastAge(birthDate, ADULT_AGE_YEARS);
}
function validateRegisterProfileStep(profile) {
    const fullName = profile.regName.trim();
    const birthDate = profile.regBirth.trim();
    if (!fullName) {
        return { ok: false, message: 'Informe seu nome.' };
    }
    if (!birthDate) {
        return { ok: false, message: 'Informe sua data de nascimento.' };
    }
    if (!parseBirthDateIso(birthDate)) {
        return { ok: false, message: 'Data de nascimento inválida.' };
    }
    if (isMinorBirthDate(birthDate) && !profile.regGuardianConsent) {
        return {
            ok: false,
            message: 'Marque o consentimento do responsável (conta de menor).',
        };
    }
    return { ok: true };
}
export function createAuthScreenController(options) {
    const bridge = getAuthBridge();
    let profileCompleteOptions = null;
    const setStatus = (message, isError) => {
        bridge.setStatus(message, isError ? 'error' : message.length > 0 ? 'success' : 'neutral');
    };
    const setBusy = (next) => {
        bridge.setBusy(next);
    };
    const requireAuthReady = () => {
        if (isSupabaseReady())
            return true;
        setStatus('Autenticação ainda carregando… Aguarde alguns segundos ou recarregue (Ctrl+F5).', true);
        return false;
    };
    const goToRegister = () => {
        if (bridge.snapshot().busy)
            return;
        clearAllOAuthFlags();
        hidePlayerInitLoading();
        showAuthView('register');
        bridge.copyLoginToRegister();
        setStatus('Preencha seus dados para criar a conta.', false);
    };
    const goToLogin = () => {
        if (bridge.snapshot().busy)
            return;
        showAuthView('login');
        setStatus('', false);
    };
    const goToForgotPassword = () => {
        if (bridge.snapshot().busy)
            return;
        const { email } = bridge.snapshot().forms;
        bridge.patchForms({ forgotEmail: email.trim() });
        showAuthView('forgot-password');
        setStatus('', false);
    };
    async function handleLogin() {
        if (bridge.snapshot().busy)
            return;
        if (!requireAuthReady())
            return;
        const forms = bridge.snapshot().forms;
        const email = forms.email.trim();
        const password = forms.password;
        if (!email || !password) {
            setStatus('Preencha email e senha.', true);
            return;
        }
        setBusy(true);
        clearAllOAuthFlags();
        markEmailCredentialAuthInFlight();
        setStatus('Validando credenciais…', false);
        logAuthApiAttempt('login', { email, via: 'GameAuthService.loginWithEmailForServer' });
        try {
            const result = await loginWithEmailForServer(email, password);
            if (!result.success || !result.user) {
                logAuthApiResult('login', 'error', { message: result.message ?? 'Credenciais inválidas.' });
                const message = result.message ?? 'Credenciais inválidas.';
                if (message.toLowerCase().includes('confirme seu email')) {
                    bridge.patchForms({ regEmail: email });
                    showAuthView('register');
                    setStatus(`${message} Reenvie o link na tela de cadastro.`, true);
                    return;
                }
                setStatus(message, true);
                return;
            }
            logAuthApiResult('login', 'success', { userId: result.user.id ?? null });
            clearAllOAuthFlags();
            setStatus(result.message ?? 'Login autorizado!', false);
            showPlayerInitLoading('Carregando personagens…');
            await options.onAuthenticated(result.user);
        }
        catch (error) {
            logAuthApiResult('login', 'error', {
                message: error instanceof Error ? error.message : String(error),
            });
            console.error('[AuthScreenController] Erro no login:', error);
            setStatus('Erro inesperado ao fazer login.', true);
        }
        finally {
            clearEmailCredentialAuthInFlight();
            setBusy(false);
        }
    }
    async function handleRegister() {
        if (bridge.snapshot().busy)
            return;
        if (!requireAuthReady())
            return;
        const forms = bridge.snapshot().forms;
        if (forms.regPass !== forms.regConfirm) {
            setStatus('As senhas não coincidem.', true);
            return;
        }
        const email = forms.regEmail.trim();
        const password = forms.regPass;
        const profileCheck = validateRegisterProfileStep(forms);
        if (!profileCheck.ok) {
            setStatus(profileCheck.message, true);
            return;
        }
        if (!email || !password) {
            setStatus('Preencha email e senha.', true);
            return;
        }
        const fullName = forms.regName.trim();
        const birthDate = forms.regBirth.trim();
        if (password.length < MIN_PASSWORD_LENGTH) {
            setStatus(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`, true);
            return;
        }
        const minor = isMinorBirthDate(birthDate);
        const parentalConsent = forms.regGuardianConsent;
        setBusy(true);
        clearAllOAuthFlags();
        markEmailCredentialAuthInFlight();
        const releaseSideEffects = suppressAuthSessionSideEffects();
        let uiWatchdog;
        let uiReleased = false;
        const releaseRegisterUi = () => {
            if (uiReleased)
                return;
            uiReleased = true;
            if (uiWatchdog !== undefined) {
                clearTimeout(uiWatchdog);
                uiWatchdog = undefined;
            }
            releaseSideEffects();
            clearEmailCredentialAuthInFlight();
            hidePlayerInitLoading();
            setBusy(false);
        };
        uiWatchdog = setTimeout(() => {
            setStatus('Cadastro demorou demais. Verifique sua conexão e tente novamente.', true);
            releaseRegisterUi();
        }, 15_000);
        setStatus('Criando conta…', false);
        logAuthApiAttempt('register', { email, via: 'GameAuthService.registerAccount' });
        try {
            const result = await registerAccount({
                email,
                password,
                fullName,
                birthDate,
                parentalConsent: minor ? parentalConsent : false,
            });
            if (!result.success) {
                logAuthApiResult('register', 'error', { message: result.message ?? 'Falha no cadastro.' });
                setStatus(result.message ?? 'Falha no cadastro.', true);
                return;
            }
            logAuthApiResult('register', 'success', { message: result.message ?? null });
            if (result.needsEmailConfirmation) {
                clearLocalSupabaseSession();
                clearAllOAuthFlags();
                resetGameStoreState();
                bridge.copyRegisterToLogin();
                showAuthView('register');
                setStatus(result.message
                    ?? 'Conta criada! Abra o email de confirmação (verifique spam) ou use o botão abaixo para reenviar.', false);
                return;
            }
            clearLocalSupabaseSession();
            clearAllOAuthFlags();
            resetGameStoreState();
            bridge.copyRegisterToLogin();
            showAuthView('login');
            setStatus(result.message ?? 'Conta criada! Faça login para continuar.', false);
        }
        catch (error) {
            logAuthApiResult('register', 'error', {
                message: error instanceof Error ? error.message : String(error),
            });
            console.error('[AuthScreenController] Erro no cadastro:', error);
            if (error instanceof AuthOperationTimeoutError) {
                setStatus(error.message, true);
            }
            else {
                setStatus('Erro inesperado ao cadastrar.', true);
            }
        }
        finally {
            releaseRegisterUi();
        }
    }
    async function handleSendPasswordReset() {
        if (bridge.snapshot().busy)
            return;
        if (!isSupabaseReady()) {
            setStatus(USER_PASSWORD_RESET_UNAVAILABLE, true);
            return;
        }
        const forms = bridge.snapshot().forms;
        const email = forms.forgotEmail.trim() || forms.email.trim();
        if (!email) {
            setStatus('Informe seu email.', true);
            return;
        }
        setBusy(true);
        setStatus('Enviando link de recuperação…', false);
        try {
            const result = await requestPasswordReset(email);
            setStatus(result.message, !result.ok);
            if (result.ok) {
                showAuthView('login');
                bridge.patchForms({ email });
            }
        }
        finally {
            setBusy(false);
        }
    }
    async function handleApplyNewPassword() {
        if (bridge.snapshot().busy)
            return;
        const forms = bridge.snapshot().forms;
        const password = forms.resetPass;
        const confirm = forms.resetConfirm;
        if (!password || !confirm) {
            setStatus('Preencha e confirme a nova senha.', true);
            return;
        }
        if (password !== confirm) {
            setStatus('As senhas não coincidem.', true);
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            setStatus(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`, true);
            return;
        }
        setBusy(true);
        setStatus('Salvando nova senha…', false);
        try {
            const result = await applyPasswordReset(password);
            setStatus(result.message, !result.ok);
            if (result.ok) {
                clearPasswordRecoveryUrl();
                showAuthView('login');
            }
        }
        finally {
            setBusy(false);
        }
    }
    async function handleResendConfirmation() {
        if (bridge.snapshot().busy)
            return;
        if (!isSupabaseReady()) {
            setStatus(USER_EMAIL_CONFIRM_UNAVAILABLE, true);
            return;
        }
        showAuthView('register');
        const forms = bridge.snapshot().forms;
        const profileCheck = validateRegisterProfileStep(forms);
        if (!profileCheck.ok) {
            setStatus(`${profileCheck.message} Depois informe o email e reenvie.`, true);
            return;
        }
        const email = forms.regEmail.trim();
        if (!email) {
            setStatus('Informe o email usado no cadastro.', true);
            return;
        }
        setBusy(true);
        setStatus('Reenviando email de confirmação…', false);
        try {
            const result = await resendEmailConfirmation(email);
            setStatus(result.message, !result.ok);
        }
        finally {
            setBusy(false);
        }
    }
    async function handleGoogleLogin() {
        if (bridge.snapshot().busy)
            return;
        if (!requireAuthReady())
            return;
        if (!isSupabaseReady()) {
            setStatus(USER_GOOGLE_LOGIN_UNAVAILABLE, true);
            return;
        }
        setBusy(true);
        setStatus(USER_GOOGLE_REDIRECT, false);
        logAuthApiAttempt('login', { via: 'GameAuthService.startGoogleOAuth', provider: 'google' });
        try {
            const result = await startGoogleOAuth();
            if (!result.ok) {
                logAuthApiResult('login', 'error', { message: result.message ?? 'Falha OAuth' });
                setStatus(result.message ?? 'Não foi possível iniciar login com Google.', true);
                setBusy(false);
            }
        }
        catch (error) {
            logAuthApiResult('login', 'error', {
                message: error instanceof Error ? error.message : String(error),
            });
            setStatus('Erro inesperado ao iniciar Google OAuth.', true);
            setBusy(false);
        }
    }
    async function openProfileComplete(panelOptions) {
        profileCompleteOptions = panelOptions;
        const user = await getUser();
        const metadata = user?.user_metadata;
        const existingName = metadata?.nome ?? metadata?.full_name;
        if (typeof existingName === 'string' && existingName.trim()) {
            bridge.patchForms({ profileName: existingName.trim() });
        }
        showAuthView('profile-complete');
        setStatus('Complete seu perfil para continuar.', false);
    }
    async function submitProfileComplete() {
        if (bridge.snapshot().busy)
            return;
        const forms = bridge.snapshot().forms;
        const birthDate = forms.profileBirth.trim();
        const fullName = forms.profileName.trim();
        const parentalConsent = forms.profileGuardianConsent;
        if (!fullName) {
            setStatus('Informe seu nome.', true);
            return;
        }
        if (!birthDate) {
            setStatus('Informe sua data de nascimento.', true);
            return;
        }
        if (!parseBirthDateIso(birthDate)) {
            setStatus('Data de nascimento inválida.', true);
            return;
        }
        const minor = !isAtLeastAge(birthDate, ADULT_AGE_YEARS);
        if (minor && !parentalConsent) {
            setStatus('Marque o consentimento do responsável (conta de menor).', true);
            return;
        }
        setBusy(true);
        setStatus('Salvando perfil…', false);
        try {
            const result = await updateUserProfileMetadata({
                birthDate,
                parentalConsent: minor ? parentalConsent : false,
                fullName,
            });
            if (!result.ok) {
                setStatus(result.message ?? 'Falha ao salvar perfil.', true);
                return;
            }
            setStatus(result.message ?? 'Perfil salvo!', false);
            await profileCompleteOptions?.onComplete();
        }
        finally {
            setBusy(false);
        }
    }
    function cancelProfileComplete() {
        profileCompleteOptions?.onCancel?.();
    }
    const controller = {
        goToLogin,
        goToRegister,
        goToForgotPassword,
        login: handleLogin,
        register: handleRegister,
        sendPasswordReset: handleSendPasswordReset,
        applyNewPassword: handleApplyNewPassword,
        resendConfirmation: handleResendConfirmation,
        googleLogin: handleGoogleLogin,
        openProfileComplete,
        submitProfileComplete,
        cancelProfileComplete,
    };
    subscribeAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
            showAuthView('reset-password');
            setStatus('Defina sua nova senha.', false);
        }
    });
    return controller;
}
export function initAuthScreenController(options) {
    const controller = createAuthScreenController(options);
    registerAuthScreenController(controller);
    document.body.dataset.reactAuthUi = '1';
    getAuthBridge().markControllerReady();
    if (isPasswordRecoverySession()) {
        showAuthView('reset-password');
        getAuthBridge().setStatus('Defina sua nova senha.', 'neutral');
    }
    else {
        showAuthView('login');
    }
    return true;
}
