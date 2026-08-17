import { friendIdentityKey } from '../../shared/social/friendListTypes.js';
import type { ChatWhisperPayload } from '../../shared/social/chatWhisperTypes.js';

export type WhisperChannelId = 'global' | string;

export type WhisperChatLine = {
  readonly id: string;
  readonly fromDisplayName: string;
  readonly text: string;
  readonly mine: boolean;
  readonly sentAt: number;
  readonly system?: boolean;
};

export type WhisperTab = {
  readonly peerPlayerId: string;
  readonly peerCharacterId: number;
  readonly displayName: string;
  readonly lines: readonly WhisperChatLine[];
  readonly unread: number;
};

export type WhisperChatState = {
  readonly activeChannel: WhisperChannelId;
  readonly tabs: readonly WhisperTab[];
};

const MAX_LINES = 40;
const listeners = new Set<() => void>();

let lineSeq = 0;
let state: WhisperChatState = { activeChannel: 'global', tabs: [] };

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeWhisperChat(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWhisperChatState(): WhisperChatState {
  return state;
}

export function whisperTabId(playerId: string, characterId: number): string {
  return friendIdentityKey(playerId, characterId);
}

function lineDedupeKey(line: Pick<WhisperChatLine, 'fromDisplayName' | 'text' | 'sentAt'>): string {
  return `${line.fromDisplayName}:${line.text}:${line.sentAt}`;
}

export function openWhisperTab(
  peerPlayerId: string,
  peerCharacterId: number,
  displayName: string,
): void {
  const id = whisperTabId(peerPlayerId, peerCharacterId);
  const existing = state.tabs.find((tab) => whisperTabId(tab.peerPlayerId, tab.peerCharacterId) === id);
  if (!existing) {
    state = {
      activeChannel: id,
      tabs: [
        ...state.tabs,
        {
          peerPlayerId,
          peerCharacterId,
          displayName,
          lines: [],
          unread: 0,
        },
      ],
    };
    notify();
    return;
  }
  state = {
    activeChannel: id,
    tabs: state.tabs.map((tab) =>
      whisperTabId(tab.peerPlayerId, tab.peerCharacterId) === id
        ? { ...tab, displayName, unread: 0 }
        : tab,
    ),
  };
  notify();
}

export function closeWhisperTab(tabId: string): void {
  const nextTabs = state.tabs.filter(
    (tab) => whisperTabId(tab.peerPlayerId, tab.peerCharacterId) !== tabId,
  );
  const active = state.activeChannel === tabId ? 'global' : state.activeChannel;
  state = { activeChannel: active, tabs: nextTabs };
  notify();
}

export function setWhisperActiveChannel(channel: WhisperChannelId): void {
  if (channel !== 'global') {
    const tab = state.tabs.find(
      (row) => whisperTabId(row.peerPlayerId, row.peerCharacterId) === channel,
    );
    if (!tab) return;
    state = {
      activeChannel: channel,
      tabs: state.tabs.map((row) =>
        whisperTabId(row.peerPlayerId, row.peerCharacterId) === channel
          ? { ...row, unread: 0 }
          : row,
      ),
    };
    notify();
    return;
  }
  if (state.activeChannel === 'global') return;
  state = { ...state, activeChannel: 'global' };
  notify();
}

function upsertTabLine(
  peerPlayerId: string,
  peerCharacterId: number,
  displayName: string,
  line: WhisperChatLine,
  activate: boolean,
): void {
  const id = whisperTabId(peerPlayerId, peerCharacterId);
  const existing = state.tabs.find((tab) => whisperTabId(tab.peerPlayerId, tab.peerCharacterId) === id);
  if (existing?.lines.some((row) => lineDedupeKey(row) === lineDedupeKey(line))) {
    if (activate && state.activeChannel !== id) {
      setWhisperActiveChannel(id);
    }
    return;
  }

  const isActive = activate || state.activeChannel === id;
  const nextTab: WhisperTab = existing
    ? {
        ...existing,
        displayName,
        lines: [...existing.lines, line].slice(-MAX_LINES),
        unread: isActive ? 0 : existing.unread + 1,
      }
    : {
        peerPlayerId,
        peerCharacterId,
        displayName,
        lines: [line],
        unread: isActive ? 0 : 1,
      };

  const tabs = existing
    ? state.tabs.map((tab) =>
        whisperTabId(tab.peerPlayerId, tab.peerCharacterId) === id ? nextTab : tab,
      )
    : [...state.tabs, nextTab];

  state = {
    activeChannel: activate ? id : state.activeChannel,
    tabs,
  };
  notify();
}

export function applyIncomingWhisper(
  payload: ChatWhisperPayload,
  localPlayerId: string,
  localCharacterId: number,
): void {
  const mine =
    payload.fromPlayerId === localPlayerId && payload.fromCharacterId === localCharacterId;
  const peerPlayerId = mine ? payload.toPlayerId : payload.fromPlayerId;
  const peerCharacterId = mine ? payload.toCharacterId : payload.fromCharacterId;
  const displayName = mine ? payload.toDisplayName : payload.fromDisplayName;
  lineSeq += 1;
  upsertTabLine(peerPlayerId, peerCharacterId, displayName, {
    id: `whisper-${lineSeq}`,
    fromDisplayName: payload.fromDisplayName,
    text: payload.text,
    mine,
    sentAt: payload.sentAt,
  }, !mine);
}

export function appendWhisperSystemLine(
  peerPlayerId: string,
  peerCharacterId: number,
  displayName: string,
  text: string,
): void {
  lineSeq += 1;
  upsertTabLine(peerPlayerId, peerCharacterId, displayName, {
    id: `whisper-${lineSeq}`,
    fromDisplayName: '',
    text,
    mine: false,
    sentAt: Date.now(),
    system: true,
  }, true);
}

export function resetWhisperChatSession(): void {
  state = { activeChannel: 'global', tabs: [] };
  notify();
}
