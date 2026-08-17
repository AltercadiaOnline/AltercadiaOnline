import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CHAT_GLOBAL_MAX_TEXT_LENGTH } from '../../../../../shared/world/globalChatTypes.js';
import { submitGlobalChatMessage } from '../../../../world/globalChatController.js';
import { openWhisperWithFriend, submitWhisperMessage } from '../../../../world/whisperChatActions.js';
import {
  closeWhisperTab,
  getWhisperChatState,
  setWhisperActiveChannel,
  subscribeWhisperChat,
  whisperTabId,
} from '../../../../world/whisperChatStore.js';
import { getFriendList, subscribeFriendList } from '../../../../world/friendListStore.js';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';
import { useWorldHudBridge } from '../../../hooks/useWorldHudBridge.js';

/** 3×3 — unicode no balão (mesmo canal CHAT_GLOBAL_SEND). */
const CHAT_REACTIONS: readonly string[] = [
  '😀',
  '😂',
  '❤️',
  '👍',
  '🔥',
  '⚔️',
  '🛡️',
  '💀',
  '✨',
];

function SmileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path d="M8.4 13.6c1.1 1.45 2.55 2.15 3.6 2.15s2.5-.7 3.6-2.15" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="9.2" cy="10.1" r="0.85" fill="currentColor" />
      <circle cx="14.8" cy="10.1" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function WorldGlobalChatWidget() {
  const { chatLines } = useWorldHudBridge();
  const friends = useSyncExternalStore(
    (onChange) => subscribeExternalStore((listener) => subscribeFriendList(listener), onChange),
    getFriendList,
    getFriendList,
  );
  const whisper = useSyncExternalStore(
    (onChange) => subscribeExternalStore((listener) => subscribeWhisperChat(listener), onChange),
    getWhisperChatState,
    getWhisperChatState,
  );
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeTab = whisper.tabs.find(
    (tab) => whisperTabId(tab.peerPlayerId, tab.peerCharacterId) === whisper.activeChannel,
  );
  const isGlobal = whisper.activeChannel === 'global' || !activeTab;
  const whisperLines = activeTab?.lines ?? [];

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTop = feed.scrollHeight;
  }, [chatLines, whisperLines, whisper.activeChannel]);

  useEffect(() => {
    if (!pickerOpen) return undefined;

    const onPointerDown = (event: PointerEvent): void => {
      const root = composerRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setPickerOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPickerOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [pickerOpen]);

  const sendText = (text: string): void => {
    if (isGlobal || !activeTab) {
      submitGlobalChatMessage(text);
      return;
    }
    submitWhisperMessage(activeTab.peerPlayerId, activeTab.peerCharacterId, text);
  };

  const handleSubmit = (): void => {
    const input = inputRef.current;
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    sendText(text);
    input.value = '';
  };

  const sendReaction = (glyph: string): void => {
    sendText(glyph);
    setPickerOpen(false);
  };

  return (
    <div
      className={`chat-box vortex-panel ui-skin-hybrid${pickerOpen ? ' chat-box--react-open' : ''}`}
      data-ui-widget="world-chat"
    >
      <div className="chat-tabs" role="tablist" aria-label="Canais de chat">
        <button
          type="button"
          role="tab"
          aria-selected={isGlobal}
          className={`chat-tab${isGlobal ? ' is-active' : ''}`}
          onClick={() => setWhisperActiveChannel('global')}
        >
          Global
        </button>
        {whisper.tabs.map((tab) => {
          const id = whisperTabId(tab.peerPlayerId, tab.peerCharacterId);
          const active = whisper.activeChannel === id;
          return (
            <div
              key={id}
              role="tab"
              aria-selected={active}
              className={`chat-tab${active ? ' is-active' : ''}${tab.unread > 0 ? ' has-unread' : ''}`}
            >
              <button
                type="button"
                className="chat-tab__open"
                onClick={() => setWhisperActiveChannel(id)}
              >
                {tab.displayName}
              </button>
              <button
                type="button"
                className="chat-tab__close"
                aria-label={`Fechar ${tab.displayName}`}
                onClick={() => closeWhisperTab(id)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      {friends.length > 0 ? (
        <ul className="chat-friends" aria-label="Amigos — clique duplo para mensagem privada">
          {friends.map((friend) => (
            <li key={whisperTabId(friend.playerId, friend.characterId)}>
              <button
                type="button"
                className={`chat-friends__name${friend.online ? ' is-online' : ''}`}
                title={friend.online ? 'Online — clique duplo para falar' : 'Offline — clique duplo abre a aba'}
                onDoubleClick={() => openWhisperWithFriend(friend.playerId, friend.characterId, friend.displayName)}
              >
                {friend.displayName}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div ref={feedRef} className="chat-content">
        {isGlobal
          ? chatLines.map((line) => (
              <p
                key={line.id}
                className={`chat-line ${line.variant === 'player' ? 'chat-line--player' : 'chat-line--system'}`}
              >
                {line.text}
              </p>
            ))
          : whisperLines.map((line) => (
              <p
                key={line.id}
                className={`chat-line ${line.system ? 'chat-line--system' : 'chat-line--player'}`}
              >
                {line.system ? line.text : `${line.fromDisplayName}: ${line.text}`}
              </p>
            ))}
      </div>
      <div ref={composerRef} className="chat-box__composer">
        {pickerOpen ? (
          <div className="chat-react-picker" role="dialog" aria-label="Reações">
            <div className="chat-react-picker__grid">
              {CHAT_REACTIONS.map((glyph) => (
                <button
                  key={glyph}
                  type="button"
                  className="chat-react-picker__item"
                  aria-label={`Reação ${glyph}`}
                  onClick={() => sendReaction(glyph)}
                >
                  {glyph}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="text"
          placeholder={isGlobal ? 'Digite sua mensagem… (máx. 72)' : `Privado: ${activeTab?.displayName ?? ''}…`}
          aria-label={isGlobal ? 'Mensagem do chat global' : 'Mensagem privada'}
          maxLength={CHAT_GLOBAL_MAX_TEXT_LENGTH}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          type="button"
          className="chat-react-btn"
          aria-label="Reações"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((open) => !open)}
        >
          <SmileIcon />
        </button>
      </div>
    </div>
  );
}
