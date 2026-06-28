import type { BrowserCombatSocket } from '../browser/createBrowserCombatSocket.js';
import { normalizeSpeechBubbleText } from '../../shared/world/speechBubbleText.js';
import type { ExplorationScene } from '../scenes/Exploration.js';
import { getSpeechBubbleManager } from './speech/SpeechBubbleManager.js';
import {
  getGlobalMessageBus,
  type GlobalMessageBusContext,
  type GlobalMessageBusCredentials,
} from '../net/GlobalMessageBus.js';

export type GlobalChatCredentials = GlobalMessageBusCredentials;

export type GlobalChatControllerOptions = {
  readonly getSocket: () => BrowserCombatSocket | null;
  readonly getCredentials: () => GlobalChatCredentials | null;
  readonly getWorld: () => ExplorationScene | null;
};

let activeChatOptions: GlobalChatControllerOptions | null = null;

function buildBusContext(options: GlobalChatControllerOptions): GlobalMessageBusContext {
  return {
    getSocket: options.getSocket,
    getCredentials: options.getCredentials,
    getViewerMapId: () => options.getWorld()?.captureExplorationSnapshot().mapId,
    onOutboundSent: (payload) => {
      const world = options.getWorld();
      const snapshot = world?.captureExplorationSnapshot();
      if (!snapshot) return;

      getSpeechBubbleManager().applyChatGlobal(
        {
          ...payload,
          x: snapshot.x,
          y: snapshot.y,
          mapId: snapshot.mapId,
        },
        snapshot.mapId,
      );
    },
    onInboundChat: (payload, viewerMapId) => {
      if (viewerMapId && payload.mapId === viewerMapId) {
        getSpeechBubbleManager().applyChatGlobal(payload, viewerMapId);
      }
    },
  };
}

export function submitGlobalChatMessage(raw: string): void {
  const text = normalizeSpeechBubbleText(raw);
  if (!text) return;
  getGlobalMessageBus().sendGlobalChat(text);
}

export function initGlobalChatController(options: GlobalChatControllerOptions): () => void {
  activeChatOptions = options;
  const bus = getGlobalMessageBus();
  bus.attach(buildBusContext(options));

  return () => {
    if (activeChatOptions === options) {
      bus.detach();
      activeChatOptions = null;
    }
  };
}

/** Reanexa listeners após reconnect do WebSocket. */
export function rebindGlobalChatSocket(
  socket: BrowserCombatSocket,
  options: GlobalChatControllerOptions,
): void {
  activeChatOptions = options;
  const bus = getGlobalMessageBus();
  bus.attach(buildBusContext(options));
  bus.reattachSocket(socket);
}
