import type { BrowserCombatSocket } from '../browser/createBrowserCombatSocket.js';
import { isPlayerOrGmChatPayload } from '../../shared/world/globalChatTypes.js';
import { CHAT_GLOBAL_INAPPROPRIATE_MESSAGE } from '../../shared/chat/chatModerationConstants.js';
import { getGlobalChatModerator } from '../../shared/chat/globalChatModerator.js';
import { getMapChatLabel } from '../../shared/world/mapChatLabels.js';
import type { ChatGlobalPayload } from '../../shared/world/globalChatTypes.js';
import { tryPostGlobalChatFromPayload, postGlobalChatLine } from '../ui/globalChat.js';
import { postGameChatMessage } from '../ui/gameChat.js';
import { normalizeSpeechBubbleText } from '../../shared/world/speechBubbleText.js';

const WS_OPEN = 1;

export type GlobalMessageBusCredentials = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
};

export type GlobalMessageBusContext = {
  readonly getSocket: () => BrowserCombatSocket | null;
  readonly getCredentials: () => GlobalMessageBusCredentials | null;
  /** Mapa atual do jogador — independente da cena Construct ativa. */
  readonly getViewerMapId: () => string | undefined;
  readonly onOutboundSent?: (payload: ChatGlobalPayload) => void;
  readonly onInboundChat?: (payload: ChatGlobalPayload, viewerMapId: string | undefined) => void;
};

type ChatListener = (payload: ChatGlobalPayload) => void;

export type GlobalChatPreviewResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly reason: string };

/**
 * Barramento global de mensagens — sobrevive a trocas de instância/cena Construct.
 * Envio via ActionDispatcher (local ou player-intent); fanout peers via `chat-global`.
 */
export class GlobalMessageBus {
  private context: GlobalMessageBusContext | null = null;

  private detachSocket: (() => void) | null = null;

  private readonly listeners = new Set<ChatListener>();

  /** Evita linha/balão duplicados no eco do próprio envio (online). */
  private lastLocalEchoKey: string | null = null;

  attach(context: GlobalMessageBusContext): void {
    this.context = context;
    this.reattachSocket();
  }

  detach(): void {
    this.detachSocket?.();
    this.detachSocket = null;
    this.context = null;
    this.lastLocalEchoKey = null;
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
      const creds = this.context?.getCredentials();
      const isSelf =
        !!creds
        && raw.playerId === creds.playerId
        && raw.characterId === creds.characterId;

      if (isSelf) {
        const echoKey = `${raw.playerId}:${raw.characterId}:${raw.text}:${raw.sentAt}`;
        if (this.lastLocalEchoKey === echoKey || this.isRecentLocalEcho(raw)) {
          return;
        }
      }

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

  /** Validação local antes de pending online. */
  previewGlobalChat(rawText: string): GlobalChatPreviewResult {
    const text = normalizeSpeechBubbleText(rawText);
    if (!text) {
      return { ok: false, reason: 'Mensagem vazia.' };
    }
    const moderation = getGlobalChatModerator().validate(text);
    if (!moderation.ok) {
      postGameChatMessage(moderation.reason);
      return { ok: false, reason: moderation.reason };
    }
    const creds = this.context?.getCredentials();
    if (!creds) {
      const reason = 'Selecione um personagem para usar o chat global.';
      postGameChatMessage(reason);
      return { ok: false, reason };
    }
    return { ok: true, text };
  }

  /**
   * Espelho local: HUD + balão — funciona sem WebSocket (modo local/mock)
   * e como otimista no online antes do fanout.
   */
  applyLocalChat(rawText: string): boolean {
    const preview = this.previewGlobalChat(rawText);
    if (!preview.ok) return false;

    const context = this.context;
    if (!context) return false;

    const creds = context.getCredentials();
    if (!creds) return false;

    const mapId = context.getViewerMapId() ?? 'unknown';
    const outbound: ChatGlobalPayload = {
      origin: 'PLAYER',
      playerId: creds.playerId,
      characterId: creds.characterId,
      displayName: creds.displayName,
      text: preview.text,
      mapId,
      x: 0,
      y: 0,
      sentAt: Date.now(),
    };

    this.lastLocalEchoKey = `${outbound.playerId}:${outbound.characterId}:${outbound.text}:${outbound.sentAt}`;

    postGlobalChatLine(creds.displayName, preview.text, {
      zoneLabel: getMapChatLabel(mapId),
      viewerMapId: mapId,
      sourceMapId: mapId,
    });

    context.onOutboundSent?.(outbound);
    return true;
  }

  /**
   * @deprecated Prefer ActionDispatcher `CHAT_GLOBAL_SEND`.
   * Mantido para compat — tenta WS legado se conectado; senão só espelho local.
   */
  sendGlobalChat(rawText: string): boolean {
    const applied = this.applyLocalChat(rawText);
    if (!applied) return false;

    const context = this.context;
    const creds = context?.getCredentials();
    const socket = context?.getSocket();
    if (!context || !creds) return true;

    if (socket && socket.readyState === WS_OPEN) {
      socket.send('chat-global-send', {
        playerId: creds.playerId,
        characterId: creds.characterId,
        text: normalizeSpeechBubbleText(rawText),
      });
    }
    return true;
  }

  private isRecentLocalEcho(raw: ChatGlobalPayload): boolean {
    const creds = this.context?.getCredentials();
    if (!creds) return false;
    if (raw.playerId !== creds.playerId || raw.characterId !== creds.characterId) {
      return false;
    }
    if (!this.lastLocalEchoKey) return false;
    const prefix = `${raw.playerId}:${raw.characterId}:${raw.text}:`;
    return this.lastLocalEchoKey.startsWith(prefix);
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
