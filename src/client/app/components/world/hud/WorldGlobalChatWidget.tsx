import { useEffect, useRef } from 'react';
import { CHAT_GLOBAL_MAX_TEXT_LENGTH } from '../../../../../shared/world/globalChatTypes.js';
import { submitGlobalChatMessage } from '../../../../world/globalChatController.js';
import { useWorldHudBridge } from '../../../hooks/useWorldHudBridge.js';

export function WorldGlobalChatWidget() {
  const { chatLines } = useWorldHudBridge();
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTop = feed.scrollHeight;
  }, [chatLines]);

  const handleSubmit = (): void => {
    const input = inputRef.current;
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    submitGlobalChatMessage(text);
    input.value = '';
  };

  return (
    <div className="chat-box vortex-panel" data-ui-widget="world-chat">
      <div className="chat-header">Chat Global</div>
      <div ref={feedRef} className="chat-content">
        {chatLines.map((line) => (
          <p
            key={line.id}
            className={`chat-line ${line.variant === 'player' ? 'chat-line--player' : 'chat-line--system'}`}
          >
            {line.text}
          </p>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        placeholder="Digite sua mensagem… (máx. 72)"
        aria-label="Mensagem do chat"
        maxLength={CHAT_GLOBAL_MAX_TEXT_LENGTH}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            handleSubmit();
          }
        }}
      />
    </div>
  );
}
