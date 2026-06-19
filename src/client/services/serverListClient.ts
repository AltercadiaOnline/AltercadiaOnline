import {
  isServerListResponse,
  type PublicServerInstanceEntry,
  type ServerListResponse,
} from '../../shared/world/serverListProtocol.js';

export async function fetchAuthoritativeServerList(): Promise<
  { ok: true; list: ServerListResponse } | { ok: false; message: string }
> {
  let response: Response;
  try {
    response = await fetch('/api/servers', {
      headers: { Accept: 'application/json' },
    });
  } catch {
    return { ok: false, message: 'Erro ao carregar lista de servidores.' };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, message: 'Resposta inválida da lista de servidores.' };
  }

  if (!response.ok) {
    const message = typeof (body as { message?: unknown })?.message === 'string'
      ? (body as { message: string }).message
      : `Lista de servidores indisponível (${response.status}).`;
    return { ok: false, message };
  }

  if (!isServerListResponse(body)) {
    return { ok: false, message: 'Formato inválido da lista de servidores.' };
  }

  return { ok: true, list: body };
}

export function pickDefaultServerEntry(
  servers: readonly PublicServerInstanceEntry[],
  preferredId?: string | null,
): PublicServerInstanceEntry | null {
  if (preferredId) {
    const match = servers.find((entry) => entry.id === preferredId);
    if (match) return match;
  }

  const deployMatch = servers.find((entry) => entry.isCurrentDeploy);
  if (deployMatch) return deployMatch;

  return servers[0] ?? null;
}
