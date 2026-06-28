import type { BrowserCombatSocket } from '../browser/createBrowserCombatSocket.js';
import { isPlayerOrGmChatPayload } from '../../shared/world/globalChatTypes.js';
import { CHAT_GLOBAL_INAPPROPRIATE_MESSAGE } from '../../shared/chat/chatModerationConstants.js';
import { getGlobalChatModerator } from '../../shared/chat/globalChatModerator.js';
import { getMapChatLabel } from '../../shared/world/mapChatLabels.js';
import type { ChatGlobalPayload } from '../../shared/world/globalChatTypes.js';
import { tryPostGlobalChatFromPayload, postGlobalChatLine } from '../ui/globalChat.js';
import { postGameChatMessage } from '../ui/gameChat.js';

const WS_OPEN = 1;

export type GlobalMessageBusCredentials = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
};

export type GlobalMessageBusContext = {
  readonly getSocket: () => BrowserCombatSocket | null;
  readonly getCredentials: () => GlobalMessageBusCredentials | null;
  /** Mapa atual do jogador — independente da cena Phaser ativa. */
  readonly getViewerMapId: () => string | undefined;
  readonly onOutboundSent?: (payload: ChatGlobalPayload) => void;
  readonly onInboundChat?: (payload: ChatGlobalPayload, viewerMapId: string | undefined) => void;
};

type ChatListener = (payload: ChatGlobalPayload) => void;

/**
 * Barramento global de mensagens — sobrevive a trocas de instância/cena Phaser.
 * Chat via WebSocket; listeners locais para HUD e bolhas.
 */
export class GlobalMessageBus {
  private context: GlobalMessageBusContext | null = null;

  private detachSocket: (() => void) | null = null;

  private readonly listeners = new Set<ChatListener>();

  attach(context: GlobalMessageBusContext): void {
    this.context = context;
    this.reattachSocket();
  }

  detach(): void {
    this.detachSocket?.();
    this.detachSocket = null;
    this.context = null;
  }

  subscribe(listener: ChatListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reattachSocket(socket?: BrowserCombatSocket | null): void {
    this.detachSocket?.();
    this.detachSocket = null;

    const activeSocket = socket ?? this.context?.getSocket() ?? null;
    if (!activeSocket || !this.context) return;

    const onChatGlobal = (raw: unknown) => {
      if (!isPlayerOrGmChatPayload(raw)) return;
      const viewerMapId = this.context?.getViewerMapId();
      tryPostGlobalChatFromPayload(raw, viewerMapId);
      this.context?.onInboundChat?.(raw, viewerMapId);
      for (const listener of this.listeners) {
        listener(raw);
      }
    };

    const onChatRejected = (raw: unknown) => {
      const reason =
        raw && typeof raw === 'object' && typeof (raw as { reason?: unknown }).reason === 'string'
          ? (raw as { reason: string }).reason
          : CHAT_GLOBAL_INAPPROPRIATE_MESSAGE;
      postGameChatMessage(reason);
    };

    activeSocket.on('chat-global', onChatGlobal);
    activeSocket.on('chat-global-rejected', onChatRejected);

    this.detachSocket = () => {
      activeSocket.removeAllListeners('chat-global');
      activeSocket.removeAllListeners('chat-global-rejected');
    };
  }

  sendGlobalChat(rawText: string): boolean {
    const context = this.context;
    if (!context) return false;

    const text = rawText.trim();
    if (!text) return false;

    const moderation = getGlobalChatModerator().validate(text);
    if (!moderation.ok) {
      postGameChatMessage(moderation.reason);
      return false;
    }

    const creds = context.getCredentials();
    const socket = context.getSocket();

    if (!creds) {
      postGameChatMessage('Selecione um personagem para usar o chat global.');
      return false;
    }

    if (!socket || socket.readyState !== WS_OPEN) {
      postGameChatMessage('Sem conexão com o servidor — aguarde o mundo sincronizar.');
      return false;
    }

    const mapId = context.getViewerMapId() ?? 'unknown';

    socket.send('chat-global-send', {
      playerId: creds.playerId,
      characterId: creds.characterId,
      text,
    });

    const outbound: ChatGlobalPayload = {
      origin: 'PLAYER',
      playerId: creds.playerId,
      characterId: creds.characterId,
      displayName: creds.displayName,
      text,
      mapId,
      x: 0,
      y: 0,
      sentAt: Date.now(),
    };

    postGlobalChatLine(creds.displayName, text, {
      zoneLabel: getMapChatLabel(mapId),
      viewerMapId: mapId,
      sourceMapId: mapId,
    });

    context.onOutboundSent?.(outbound);
    return true;
  }
}

let bus: GlobalMessageBus | null = null;

export function getGlobalMessageBus(): GlobalMessageBus {
  if (!bus) {
    bus = new GlobalMessageBus();
  }
  return bus;
}

export function resetGlobalMessageBus(): void {
  bus?.detach();
  bus = null;
}
