import { FormEvent, useState } from 'react';
import { getBattleHudBridge } from '../../bridge/battleHudBridge.js';
import type { BattleHudChatLine } from '../../bridge/battleHudBridge.js';

type BattleChatPanelProps = {
  lines: readonly BattleHudChatLine[];
};

const BATTLE_CHAT_EVENT = 'altercadia:battle-chat-send';

export function BattleChatPanel({ lines }: BattleChatPanelProps) {
  const [draft, setDraft] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;

    getBattleHudBridge().appendChatLine('YOU', message);
    document.dispatchEvent(new CustomEvent(BATTLE_CHAT_EVENT, {
      detail: { message },
    }));
    setDraft('');
  };

  return (
    <section id="react-battle-chat" className="battle-chat-panel terminal-panel" aria-label="Battle Chat">
      <h2 className="battle-panel-title">
        <span className="terminal-prompt">&gt;</span>
        {' '}
        BATTLE_CHAT
      </h2>
      <div id="react-battle-chat-content" className="battle-chat-content battle-chat-content--terminal">
        {lines.map((line) => (
          <p key={line.id} className="battle-chat__line">
            <span className="battle-chat__author">
              {line.author}
              :
            </span>
            {' '}
            {line.text}
          </p>
        ))}
      </div>
      <form className="battle-chat-form" onSubmit={handleSubmit}>
        <span className="terminal-prompt" aria-hidden="true">&gt;</span>
        <input
          id="react-battle-chat-input"
          type="text"
          placeholder="msg..."
          maxLength={120}
          autoComplete="off"
          aria-label="Mensagem de batalha"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="battle-chat-send">SEND</button>
      </form>
    </section>
  );
}
