import { getMapChatLabel } from '../../shared/world/mapChatLabels.js';
import { isPlayerOrGmChatPayload } from '../../shared/world/globalChatTypes.js';

export type GlobalChatLineOptions = {
  /** Zona de origem da mensagem (ex.: Cidade, Periferia). */
  readonly zoneLabel?: string;
  /** Zona atual do observador — omite tag quando igual à origem. */
  readonly viewerMapId?: string;
  readonly sourceMapId?: string;
};

function resolveZonePrefix(options?: GlobalChatLineOptions): string {
  if (!options?.zoneLabel) return '';
  if (options.viewerMapId && options.sourceMapId && options.viewerMapId === options.sourceMapId) {
    return '';
  }
  return `[${options.zoneLabel}] `;
}

/**
 * Linha de jogador no Chat Global — apenas origem PLAYER ou GM.
 * Mensagens SYSTEM_* devem usar logService (não passam por aqui).
 */
export function postGlobalChatLine(
  displayName: string,
  message: string,
  options?: GlobalChatLineOptions,
): void {
  if (typeof document === 'undefined') {
    const prefix = resolveZonePrefix(options);
    console.log(`[Altercadia/chat] ${prefix}${displayName}: ${message}`);
    return;
  }

  const content = document.querySelector<HTMLElement>('.chat-content');
  if (!content) return;

  const line = document.createElement('p');
  line.className = 'chat-line chat-line--player';
  line.textContent = `${resolveZonePrefix(options)}${displayName}: ${message}`;
  content.appendChild(line);

  while (content.children.length > 40) {
    content.firstChild?.remove();
  }

  content.scrollTop = content.scrollHeight;
}

/**
 * Retorno falso = não processar (economiza CPU no pipeline de chat).
 */
export function tryPostGlobalChatFromPayload(
  raw: unknown,
  viewerMapId?: string,
): boolean {
  if (!isPlayerOrGmChatPayload(raw)) return false;

  postGlobalChatLine(raw.displayName, raw.text, {
    zoneLabel: getMapChatLabel(raw.mapId),
    sourceMapId: raw.mapId,
    ...(viewerMapId !== undefined ? { viewerMapId } : {}),
  });
  return true;
}
