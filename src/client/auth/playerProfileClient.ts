import { listHubCharacters } from '../../shared/characterHub.js';
import {
  isAuthoritativePlayerSnapshotResponse,
  isPlayerSnapshotNotReadyResponse,
} from '../../shared/auth/playerSnapshotProtocol.js';
import { AppScreens } from '../browser/appScreens.js';
import { gameServerFetch, isGameServerFetchTimeoutError } from '../net/gameServerClient.js';
import { getGlobalStateSynchronizer } from '../sync/GlobalStateSynchronizer.js';
import { resolveActiveServerId } from './resolveLoginServerId.js';
import { updatePlayerInitLoadingMessage } from './playerInitLoading.js';
import { CHAR_SELECT_API_DEADLINE_MS } from '../net/gameServerClient.js';

export function resolveDefaultCharacterIdForProfile(): number {
  const hub = AppScreens.characterHub;
  if (hub) {
    const characters = listHubCharacters(hub);
    if (characters.length > 0) {
      return characters[0]!.id;
    }
  }
  return 1;
}

const SNAPSHOT_MAX_ATTEMPTS = 10;
const SNAPSHOT_RETRY_DELAY_MS = 500;
const SNAPSHOT_TOTAL_DEADLINE_MS = 30_000;
const SNAPSHOT_REQUEST_DEADLINE_MS = Math.max(CHAR_SELECT_API_DEADLINE_MS, 8_000);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type SnapshotFetchResult =
  | { readonly ok: true; readonly ready: true }
  | { readonly ok: false; readonly message: string; readonly retryable?: boolean };

async function fetchAuthoritativePlayerSnapshotOnce(
  characterId: number,
): Promise<SnapshotFetchResult> {
  let response: Response;
  try {
    response = await gameServerFetch('/api/player-snapshot', {
      searchParams: {
        characterId: String(characterId),
        serverId: resolveActiveServerId(),
      },
      deadlineMs: SNAPSHOT_REQUEST_DEADLINE_MS,
    });
  } catch (error) {
    if (isGameServerFetchTimeoutError(error)) {
      return { ok: false, message: 'Servidor demorou demais ao carregar o perfil.' };
    }
    return { ok: false, message: 'Erro ao conectar ao servidor de dados.' };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, message: 'Resposta inválida do servidor.' };
  }

  if (response.status === 503 && isPlayerSnapshotNotReadyResponse(body)) {
    return {
      ok: false,
      message: body.error,
      retryable: true,
    };
  }

  if (!response.ok) {
    const message = typeof (body as { error?: string }).error === 'string'
      ? (body as { error: string }).error
      : 'Não foi possível carregar o perfil do jogador.';
    return { ok: false, message };
  }

  if (isAuthoritativePlayerSnapshotResponse(body)) {
    getGlobalStateSynchronizer().applyFullState(body.snapshot);
    return { ok: true, ready: true };
  }

  return { ok: false, message: 'Snapshot autoritativo inválido — aguardando ready: true.' };
}

/**
 * Aguarda o servidor Railway provisionar perfil + snapshot (pós-OAuth / login Supabase).
 */
export async function initializeAuthoritativePlayerSnapshot(
  characterId?: number,
): Promise<{ ok: boolean; ready?: boolean; message?: string }> {
  const resolvedCharacterId = characterId ?? resolveDefaultCharacterIdForProfile();
  const startedAt = Date.now();

  for (let attempt = 0; attempt < SNAPSHOT_MAX_ATTEMPTS; attempt += 1) {
    if (Date.now() - startedAt > SNAPSHOT_TOTAL_DEADLINE_MS) {
      return {
        ok: false,
        message: 'Servidor demorou demais ao preparar o personagem. Tente novamente.',
      };
    }

    if (attempt > 0) {
      updatePlayerInitLoadingMessage(
        `Sincronizando perfil no servidor… (${attempt + 1}/${SNAPSHOT_MAX_ATTEMPTS})`,
      );
    }

    const result = await fetchAuthoritativePlayerSnapshotOnce(resolvedCharacterId);
    if (result.ok) {
      return { ok: true, ready: true };
    }

    if (!result.retryable || attempt >= SNAPSHOT_MAX_ATTEMPTS - 1) {
      return { ok: false, message: result.message };
    }

    await sleep(SNAPSHOT_RETRY_DELAY_MS);
  }

  return {
    ok: false,
    message: 'Perfil ainda não inicializado no servidor. Tente novamente.',
  };
}

/** @deprecated Prefer initializeAuthoritativePlayerSnapshot. */
export async function fetchAndHydratePlayerProfile(
  characterId?: number,
): Promise<{ ok: boolean; message?: string }> {
  return initializeAuthoritativePlayerSnapshot(characterId);
}
