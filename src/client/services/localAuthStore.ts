// @ts-nocheck
import { ensureCharacterHub } from './localCharacterHubStore.js';
const STORAGE_KEY = 'altercadia.local.users';
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function readUsers() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .filter((entry) => typeof entry === 'object' && entry !== null)
            .map((entry) => ({
            id: typeof entry.id === 'string' ? entry.id : crypto.randomUUID(),
            email: typeof entry.email === 'string' ? entry.email : '',
            fullName: typeof entry.fullName === 'string' ? entry.fullName : '',
            birthDate: typeof entry.birthDate === 'string' ? entry.birthDate : '2000-01-01',
        }))
            .filter((entry) => entry.email.length > 0);
    }
    catch {
        return [];
    }
}
function writeUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}
/** Dev-only — não persiste senha; credencial real fica no Supabase Auth. */
export function registerLocalUser(payload) {
    const normalizedEmail = normalizeEmail(payload.email);
    const fullName = payload.fullName.trim();
    const birthDate = payload.birthDate.trim();
    if (!fullName || !birthDate || !normalizedEmail) {
        return { ok: false, message: 'Preencha todos os campos do cadastro.' };
    }
    if (!normalizedEmail.includes('@')) {
        return { ok: false, message: 'Informe um email válido.' };
    }
    if (payload.password.length < 6) {
        return { ok: false, message: 'A senha deve ter pelo menos 6 caracteres.' };
    }
    const users = readUsers();
    if (users.some((user) => user.email === normalizedEmail)) {
        return { ok: false, message: 'Este email já está cadastrado.' };
    }
    const newUser = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        fullName,
        birthDate,
    };
    users.push(newUser);
    writeUsers(users);
    ensureCharacterHub(newUser.id);
    return { ok: true, message: 'Conta criada! Volte e use LOGIN para entrar.' };
}
/** Dev-only — login por email (sem verificação de senha local). */
export function loginLocalUser(email, _password) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return { ok: false, message: 'Informe um email válido.' };
    }
    const user = readUsers().find((entry) => entry.email === normalizedEmail);
    if (!user) {
        return { ok: false, message: 'Conta não encontrada neste navegador (modo dev).' };
    }
    return {
        ok: true,
        message: 'Login autorizado (modo dev local).',
        user: { email: user.email, id: user.id, fullName: user.fullName ?? '' },
    };
}
/** Remove contas legadas que ainda tinham campo password em localStorage. */
export function migrateLegacyLocalUsersWithoutPasswords() {
    writeUsers(readUsers());
}
