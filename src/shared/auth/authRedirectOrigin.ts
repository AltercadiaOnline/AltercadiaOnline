/** Front-end público de produção — links de email/OAuth devem apontar aqui. */
export const DEFAULT_PUBLIC_SITE_ORIGIN = 'https://altercadia-online.vercel.app';

export type AuthRedirectOriginConfig = {
  readonly publicSiteUrl?: string | null;
};

/** Preview Vercel exige login SSO e quebra confirmação de email (?code=). */
export function isVercelPreviewHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  if (host.includes('-projects.vercel.app')) return true;
  if (host.endsWith('.vercel.app') && host !== 'altercadia-online.vercel.app') {
    return true;
  }
  return false;
}

export function normalizePublicSiteOrigin(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return url.origin.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/** Origin usada em redirectTo / emailRedirectTo — nunca preview protegida da Vercel. */
export function resolveAuthRedirectOrigin(
  config?: AuthRedirectOriginConfig | null,
): string {
  const configured = normalizePublicSiteOrigin(config?.publicSiteUrl);
  if (configured) return configured;

  if (typeof window !== 'undefined') {
    const current = window.location.origin.replace(/\/+$/, '');
    if (!isVercelPreviewHostname(window.location.hostname)) {
      return current;
    }
  }

  return DEFAULT_PUBLIC_SITE_ORIGIN;
}

/** Se o link de confirmação caiu em preview Vercel, reescreve para produção. */
export function resolveAuthCallbackLandingUrl(
  href: string,
  config?: AuthRedirectOriginConfig | null,
): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  if (!isVercelPreviewHostname(url.hostname)) return null;

  const canonical = resolveAuthRedirectOrigin(config);
  const path = url.pathname === '/' || url.pathname === ''
    ? '/characters'
    : url.pathname.startsWith('/characters')
      ? url.pathname
      : '/characters';

  return `${canonical}${path}${url.search}${url.hash}`;
}
