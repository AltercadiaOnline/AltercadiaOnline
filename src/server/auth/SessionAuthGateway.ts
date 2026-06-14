import type { ServerEnv } from '../config/env.js';

export type VerifiedAuthSession = {
  readonly userId: string;
  readonly email?: string;
};

type SupabaseAuthClient = {
  auth: {
    getUser(jwt: string): Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error: { message: string } | null;
    }>;
  };
};

/**
 * Valida JWT Supabase (getUser) antes de aceitar world-login ou ações sensíveis.
 * Nunca registra tokens ou senhas nos logs.
 */
export class SessionAuthGateway {
  private supabase: SupabaseAuthClient | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly env: ServerEnv) {}

  /** Supabase configurado — exige JWT válido em produção (ou quando bypass desligado). */
  isAuthRequired(): boolean {
    if (this.env.devAuthBypass) return false;
    return Boolean(this.env.supabaseUrl && this.resolveSupabaseKey());
  }

  async verifyAccessToken(accessToken: string): Promise<VerifiedAuthSession | null> {
    const token = accessToken.trim();
    if (!token) return null;

    if (!this.isAuthRequired()) {
      return null;
    }

    await this.ensureClient();
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase.auth.getUser(token);
      if (error || !data.user?.id) {
        console.warn('[Auth] JWT inválido ou expirado.');
        return null;
      }

      return {
        userId: data.user.id,
        ...(data.user.email ? { email: data.user.email } : {}),
      };
    } catch (error) {
      console.warn('[Auth] Falha ao validar JWT.', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      return null;
    }
  }

  private resolveSupabaseKey(): string | null {
    return this.env.supabaseServiceRoleKey ?? this.env.supabaseAnonKey;
  }

  private async ensureClient(): Promise<void> {
    if (this.supabase || this.initPromise) {
      await this.initPromise;
      return;
    }

    const url = this.env.supabaseUrl;
    const key = this.resolveSupabaseKey();
    if (!url || !key) return;

    this.initPromise = (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      this.supabase = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }) as SupabaseAuthClient;
    })();

    await this.initPromise;
  }
}

let activeGateway: SessionAuthGateway | null = null;

export function initSessionAuthGateway(env: ServerEnv): SessionAuthGateway {
  activeGateway = new SessionAuthGateway(env);
  return activeGateway;
}

export function getSessionAuthGateway(): SessionAuthGateway {
  if (!activeGateway) {
    throw new Error('[Auth] SessionAuthGateway não inicializado — chame initSessionAuthGateway no bootstrap.');
  }
  return activeGateway;
}
