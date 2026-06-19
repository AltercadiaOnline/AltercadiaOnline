import type { AccountCharacterHub } from '../../shared/characterHub.js';
import {
  isCharacterHubErrorResponse,
  isCharacterHubResponse,
  resolveCharacterHubErrorMessage,
  type CreateCharacterRequest,
} from '../../shared/auth/characterHubProtocol.js';
import { allowsOfflineGameplayFallback } from '../runtime/onlineFirstPolicy.js';
import { resolveActiveServerId } from '../auth/resolveLoginServerId.js';
import { getSupabaseClient, resolveSessionAccessToken } from '../auth/supabaseAuth.js';
import { getLocalSession } from '../services/localSessionStore.js';
import { isLocalDevHost } from '../auth/localDevAuth.js';

async function resolveHubAuth(): Promise<{ token: string | null; devPlayerId: string | null }> {
  const token = await resolveSessionAccessToken();
  if (token) {
    return { token, devPlayerId: null };
  }

  if (isLocalDevHost() && !getSupabaseClient()) {
    const session = getLocalSession();
    if (session?.id) {
      return { token: null, devPlayerId: session.id };
    }
  }

  return { token: null, devPlayerId: null };
}

function buildCharacterHubUrl(auth: { devPlayerId: string | null }): URL {
  const url = new URL('/api/character-hub', window.location.origin);
  if (auth.devPlayerId) {
    url.searchParams.set('playerId', auth.devPlayerId);
  }
  url.searchParams.set('serverId', resolveActiveServerId());
  return url;
}

export function shouldUseAuthoritativeCharacterHub(): boolean {
  return !allowsOfflineGameplayFallback() || Boolean(getSupabaseClient());
}

export async function fetchAuthoritativeCharacterHub(): Promise<
  { ok: true; hub: AccountCharacterHub } | { ok: false; message: string }
> {
  const auth = await resolveHubAuth();
  if (!auth.token && !auth.devPlayerId) {
    return { ok: false, message: 'Sessão não autenticada.' };
  }

  const url = buildCharacterHubUrl(auth);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), { headers });
  } catch {
    return { ok: false, message: 'Erro ao conectar ao servidor de dados.' };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, message: 'Resposta inválida do servidor.' };
  }

  if (isCharacterHubResponse(body)) {
    return { ok: true, hub: body.hub };
  }

  if (isCharacterHubErrorResponse(body)) {
    return { ok: false, message: body.message };
  }

  const resolved = resolveCharacterHubErrorMessage(body);
  if (resolved) {
    return { ok: false, message: resolved };
  }

  return { ok: false, message: 'Hub de personagens inválido.' };
}

export async function createAuthoritativeCharacter(
  input: CreateCharacterRequest,
): Promise<{ ok: true; hub: AccountCharacterHub } | { ok: false; message: string }> {
  const auth = await resolveHubAuth();
  if (!auth.token && !auth.devPlayerId) {
    return { ok: false, message: 'Sessão não autenticada.' };
  }

  const url = buildCharacterHubUrl(auth);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, message: 'Erro ao conectar ao servidor de dados.' };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, message: 'Resposta inválida do servidor.' };
  }

  if (isCharacterHubResponse(body)) {
    return { ok: true, hub: body.hub };
  }

  if (isCharacterHubErrorResponse(body)) {
    return { ok: false, message: body.message };
  }

  const createResolved = resolveCharacterHubErrorMessage(body);
  if (createResolved) {
    return { ok: false, message: createResolved };
  }

  return { ok: false, message: 'Falha ao criar personagem.' };
}
