import type { LogServicePayload } from '../../../shared/world/logServiceTypes.js';
import { SystemMessageKind } from '../../../shared/world/logServiceTypes.js';

export type WorldHudChatLine = {
  readonly id: string;
  readonly text: string;
  readonly variant: 'player' | 'system';
};

export type WorldHudLogLine = {
  readonly id: string;
  readonly kind: LogServicePayload['kind'];
  readonly message: string;
};

export type WorldHudSnapshot = {
  readonly chatLines: readonly WorldHudChatLine[];
  readonly logLines: readonly WorldHudLogLine[];
  readonly logUnreadCount: number;
};

type WorldHudListener = (snapshot: WorldHudSnapshot) => void;

const MAX_CHAT_LINES = 40;
const MAX_LOG_LINES = 48;

let chatSeq = 0;
let logSeq = 0;

class WorldHudBridge {
  private readonly listeners = new Set<WorldHudListener>();

  private chatLines: WorldHudChatLine[] = [];

  private logLines: WorldHudLogLine[] = [];

  private logBuffer: LogServicePayload[] = [];

  private logUnreadCount = 0;

  private logPanelExpanded = true;

  subscribe(listener: WorldHudListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): WorldHudSnapshot {
    return {
      chatLines: this.chatLines,
      logLines: this.logLines,
      logUnreadCount: this.logUnreadCount,
    };
  }

  setLogPanelExpanded(expanded: boolean): void {
    this.logPanelExpanded = expanded;
    if (expanded) {
      this.logUnreadCount = 0;
      if (this.logLines.length === 0) {
        this.replayLogBuffer();
      }
    }
    this.emit();
  }

  isLogPanelExpanded(): boolean {
    return this.logPanelExpanded;
  }

  pushChatLine(text: string, variant: WorldHudChatLine['variant'] = 'player'): void {
    chatSeq += 1;
    this.chatLines = [
      ...this.chatLines,
      { id: `chat-${chatSeq}`, text, variant },
    ].slice(-MAX_CHAT_LINES);
    this.emit();
  }

  publishLogMessage(payload: LogServicePayload): void {
    this.logBuffer.push(payload);
    if (this.logBuffer.length > MAX_LOG_LINES) {
      this.logBuffer.shift();
    }

    if (!this.logPanelExpanded) {
      this.logUnreadCount += 1;
    } else {
      this.logUnreadCount = 0;
      this.appendLogLine(payload);
    }

    this.emit();
  }

  resetSession(): void {
    this.chatLines = [];
    this.logLines = [];
    this.logBuffer = [];
    this.logUnreadCount = 0;
    this.logPanelExpanded = true;
    this.emit();
  }

  private replayLogBuffer(): void {
    this.logLines = this.logBuffer.map((payload) => this.toLogLine(payload));
  }

  private appendLogLine(payload: LogServicePayload): void {
    logSeq += 1;
    this.logLines = [
      ...this.logLines,
      { ...this.toLogLine(payload), id: `log-${logSeq}` },
    ].slice(-MAX_LOG_LINES);
  }

  private toLogLine(payload: LogServicePayload): WorldHudLogLine {
    return {
      id: `log-${payload.kind}-${payload.message}`,
      kind: payload.kind,
      message: payload.message,
    };
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

type GlobalWithWorldHudBridge = typeof globalThis & {
  __ALTERCADIA_WORLD_HUD_BRIDGE__?: WorldHudBridge;
};

export function getWorldHudBridge(): WorldHudBridge {
  const globalRef = globalThis as GlobalWithWorldHudBridge;
  if (!globalRef.__ALTERCADIA_WORLD_HUD_BRIDGE__) {
    globalRef.__ALTERCADIA_WORLD_HUD_BRIDGE__ = new WorldHudBridge();
  }
  return globalRef.__ALTERCADIA_WORLD_HUD_BRIDGE__;
}

export function formatWorldHudLogLine(line: WorldHudLogLine): string {
  const label = line.kind === SystemMessageKind.SYSTEM_TIP ? 'Dica' : 'Sistema';
  return `[${label}] ${line.message}`;
}
