import type { User } from '@supabase/supabase-js';

import { readBirthDateFromUserMetadata } from '../../shared/auth/accountAgePolicy.js';
import { USER_AUTH_UNAVAILABLE } from '../../shared/brand.js';
import { getSupabaseClient, getUser } from './supabaseAuth.js';

export function userNeedsProfileMetadata(user: User | null | undefined): boolean {
  if (!user) return false;
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  return !readBirthDateFromUserMetadata(metadata);
}

export async function currentUserNeedsProfileMetadata(): Promise<boolean> {
  const user = await getUser();
  return userNeedsProfileMetadata(user);
}

export async function updateUserProfileMetadata(payload: {
  birthDate: string;
  parentalConsent: boolean;
  fullName?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, message: USER_AUTH_UNAVAILABLE };
  }

  const fullName = payload.fullName?.trim() ?? '';
  const birthDate = payload.birthDate.trim();
  const { error } = await supabase.auth.updateUser({
    data: {
      dataNascimento: birthDate,
      consentimento_responsavel: payload.parentalConsent,
      ...(fullName
        ? { nome: fullName, full_name: fullName }
        : {}),
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: 'Perfil atualizado.' };
}
