import { isPlayerOrGmChatPayload } from '../../shared/world/globalChatTypes.js';
import { CHAT_GLOBAL_MAX_TEXT_LENGTH } from '../../shared/world/globalChatTypes.js';
import { getMapChatLabel } from '../../shared/world/mapChatLabels.js';
import { normalizeSpeechBubbleText } from '../../shared/world/speechBubbleText.js';
import { getGlobalChatModerator } from '../../shared/chat/globalChatModerator.js';
import { CHAT_GLOBAL_INAPPROPRIATE_MESSAGE } from '../../shared/chat/chatModerationConstants.js';
import type { BrowserCombatSocket } from '../browser/createBrowserCombatSocket.js';
import type { ExplorationScene } from '../scenes/Exploration.js';
import { tryPostGlobalChatFromPayload, postGlobalChatLine } from '../ui/globalChat.js';
import { postGameChatMessage } from '../ui/gameChat.js';
import { getSpeechBubbleManager } from './speech/SpeechBubbleManager.js';

export type GlobalChatCredentials = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
};

export type GlobalChatControllerOptions = {
  readonly getSocket: () => BrowserCombatSocket | null;
  readonly getCredentials: () => GlobalChatCredentials | null;
  readonly getWorld: () => ExplorationScene | null;
};

const WS_OPEN = 1;

let chatInputBound = false;
let detachSocketListeners: (() => void) | null = null;

function normalizeOutboundText(raw: string): string {
  return normalizeSpeechBubbleText(raw);
}

function bindChatInput(options: GlobalChatControllerOptions): void {
  if (chatInputBound || typeof document === 'undefined') return;
  const input = document.querySelector<HTMLInputElement>('#chat-box input');
  if (!input) return;

  chatInputBound = true;
  input.maxLength = CHAT_GLOBAL_MAX_TEXT_LENGTH;
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const text = normalizeOutboundText(input.value);
    if (!text) return;

    const moderation = getGlobalChatModerator().validate(text);
    if (!moderation.ok) {
      postGameChatMessage(moderation.reason);
      return;
    }

    const creds = options.getCredentials();
    const socket = options.getSocket();

    if (!creds) {
      postGameChatMessage('Selecione um personagem para usar o chat global.');
      return;
    }

    if (!socket || socket.readyState !== WS_OPEN) {
      postGameChatMessage('Sem conexão com o servidor — aguarde o mundo sincronizar.');
      return;
    }

    const world = options.getWorld();
    const snapshot = world?.captureExplorationSnapshot();
    const mapId = snapshot?.mapId ?? 'unknown';

    socket.send('chat-global-send', {
      playerId: creds.playerId,
      characterId: creds.characterId,
      text,
    });

    postGlobalChatLine(creds.displayName, text, {
      zoneLabel: getMapChatLabel(mapId),
      viewerMapId: mapId,
      sourceMapId: mapId,
    });

    if (snapshot) {
      getSpeechBubbleManager().applyChatGlobal(
        {
          origin: 'PLAYER',
          playerId: creds.playerId,
          characterId: creds.characterId,
          displayName: creds.displayName,
          text,
          mapId: snapshot.mapId,
          x: snapshot.x,
          y: snapshot.y,
          sentAt: Date.now(),
        },
        snapshot.mapId,
      );
    }

    input.value = '';
  });
}

function attachSocketListeners(
  socket: BrowserCombatSocket,
  options: GlobalChatControllerOptions,
): () => void {
  const onChatGlobal = (raw: unknown) => {
    if (!isPlayerOrGmChatPayload(raw)) return;

    const viewerMapId = options.getWorld()?.captureExplorationSnapshot().mapId;
    tryPostGlobalChatFromPayload(raw, viewerMapId);

    if (viewerMapId && raw.mapId === viewerMapId) {
      getSpeechBubbleManager().applyChatGlobal(raw, viewerMapId);
    }
  };

  const onChatRejected = (raw: unknown) => {
    const reason =
      raw && typeof raw === 'object' && typeof (raw as { reason?: unknown }).reason === 'string'
        ? (raw as { reason: string }).reason
        : CHAT_GLOBAL_INAPPROPRIATE_MESSAGE;
    postGameChatMessage(reason);
  };

  socket.on('chat-global', onChatGlobal);
  socket.on('chat-global-rejected', onChatRejected);

  return () => {
    socket.removeAllListeners('chat-global');
    socket.removeAllListeners('chat-global-rejected');
  };
}

export function initGlobalChatController(options: GlobalChatControllerOptions): () => void {
  bindChatInput(options);

  detachSocketListeners?.();
  detachSocketListeners = null;

  const socket = options.getSocket();
  if (socket) {
    detachSocketListeners = attachSocketListeners(socket, options);
  }

  return () => {
    detachSocketListeners?.();
    detachSocketListeners = null;
  };
}

/** Reanexa listeners após reconnect do WebSocket. */
export function rebindGlobalChatSocket(
  socket: BrowserCombatSocket,
  options: GlobalChatControllerOptions,
): void {
  detachSocketListeners?.();
  detachSocketListeners = attachSocketListeners(socket, options);
}
