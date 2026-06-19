import type { AccountCharacterHub } from '../../shared/characterHub.js';
import {
  isCharacterHubErrorResponse,
  isCharacterHubResponse,
  resolveCharacterHubErrorMessage,
  type CreateCharacterRequest,
} from '../../shared/auth/characterHubProtocol.js';
import { resolveActiveServerId } from '../auth/resolveLoginServerId.js';
import { resolveSessionAccessToken } from '../auth/supabaseAuth.js';

function buildCharacterHubUrl(): URL {
  const url = new URL('/api/character-hub', window.location.origin);
  url.searchParams.set('serverId', resolveActiveServerId());
  return url;
}

export function shouldUseAuthoritativeCharacterHub(): boolean {
  return true;
}

export async function fetchAuthoritativeCharacterHub(): Promise<
  { ok: true; hub: AccountCharacterHub } | { ok: false; message: string }
> {
  const token = await resolveSessionAccessToken();
  if (!token) {
    return { ok: false, message: 'Sessão não autenticada.' };
  }

  const url = buildCharacterHubUrl();

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
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

  const resolved = resolveCharacterHubErrorMessage(body);
  if (resolved) {
    return { ok: false, message: resolved };
  }

  return { ok: false, message: 'Hub de personagens inválido.' };
}

export async function createAuthoritativeCharacter(
  input: CreateCharacterRequest,
): Promise<{ ok: true; hub: AccountCharacterHub } | { ok: false; message: string }> {
  const token = await resolveSessionAccessToken();
  if (!token) {
    return { ok: false, message: 'Sessão não autenticada.' };
  }

  const url = buildCharacterHubUrl();

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
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
