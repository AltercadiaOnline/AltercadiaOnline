import type { AccountCharacterHub } from '../../shared/characterHub.js';
import {
  isCharacterHubErrorResponse,
  isCharacterHubResponse,
  resolveCharacterHubErrorMessage,
  type CreateCharacterRequest,
} from '../../shared/auth/characterHubProtocol.js';
import { resolveActiveServerId } from '../auth/resolveLoginServerId.js';
import { gameServerFetch, isGameServerFetchTimeoutError } from '../net/gameServerClient.js';

function buildCharacterHubPath(): string {
  return '/api/character-hub';
}

export function shouldUseAuthoritativeCharacterHub(): boolean {
  return true;
}

export async function fetchAuthoritativeCharacterHub(): Promise<
  { ok: true; hub: AccountCharacterHub } | { ok: false; message: string }
> {
  let response: Response;
  try {
    response = await gameServerFetch(buildCharacterHubPath(), {
      searchParams: { serverId: resolveActiveServerId() },
    });
  } catch (error) {
    if (isGameServerFetchTimeoutError(error)) {
      return { ok: false, message: 'Servidor demorou demais. Tente novamente em instantes.' };
    }
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
  let response: Response;
  try {
    response = await gameServerFetch(buildCharacterHubPath(), {
      method: 'POST',
      searchParams: { serverId: resolveActiveServerId() },
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (isGameServerFetchTimeoutError(error)) {
      return { ok: false, message: 'Servidor demorou demais. Tente novamente em instantes.' };
    }
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
