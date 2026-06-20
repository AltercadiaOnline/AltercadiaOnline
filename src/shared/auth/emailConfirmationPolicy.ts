/** Subconjunto do User Supabase — sem dependência do SDK no shared. */
export type EmailConfirmUserLike = {
  readonly email_confirmed_at?: string | null;
  readonly app_metadata?: {
    readonly provider?: string;
    readonly providers?: readonly string[];
  };
};

export function isGoogleAuthUser(user: EmailConfirmUserLike | null | undefined): boolean {
  if (!user) return false;
  if (user.app_metadata?.provider === 'google') return true;
  return user.app_metadata?.providers?.includes('google') ?? false;
}

/** Email/senha exige link de confirmação; OAuth (Google) já valida email no provedor. */
export function isSupabaseEmailConfirmed(user: EmailConfirmUserLike | null | undefined): boolean {
  if (!user) return false;
  if (user.email_confirmed_at) return true;
  return isGoogleAuthUser(user);
}
