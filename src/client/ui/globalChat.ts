import { getMapChatLabel } from '../../shared/world/mapChatLabels.js';
import { isPlayerOrGmChatPayload } from '../../shared/world/globalChatTypes.js';
import { getWorldHudBridge } from '../app/bridge/worldHudBridge.js';

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
 * Render: WorldGlobalChatWidget via worldHudBridge.
 */
export function postGlobalChatLine(
  displayName: string,
  message: string,
  options?: GlobalChatLineOptions,
): void {
  const prefix = resolveZonePrefix(options);
  const lineText = `${prefix}${displayName}: ${message}`;
  getWorldHudBridge().pushChatLine(lineText, 'player');
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
