import { FormEvent, useState } from 'react';
import { sendBattleChatMessage } from '../../battle/battleChatHandlers.js';
import type { BattleHudChatLine } from '../../battle/battleHudTypes.js';
import { getOpponentChatAuthorLabel } from '../../../ui/battle/postBattleHonorContext.js';
import { tryOpenHonorCardFromChatAuthor } from '../../../ui/battle/postBattleHonorOpener.js';

type BattleChatPanelProps = {
  lines: readonly BattleHudChatLine[];
};

export function BattleChatPanel({ lines }: BattleChatPanelProps) {
  const [draft, setDraft] = useState('');
  const opponentLabel = getOpponentChatAuthorLabel()?.trim().toLowerCase() ?? '';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;

    sendBattleChatMessage(message);
    setDraft('');
  };

  const handleOpponentClick = (author: string) => {
    tryOpenHonorCardFromChatAuthor(author);
  };

  return (
    <section id="react-battle-chat" className="battle-chat-panel terminal-panel" aria-label="Battle Chat">
      <h2 className="battle-panel-title">
        <span className="terminal-prompt">&gt;</span>
        {' '}
        BATTLE_CHAT
      </h2>
      <div id="react-battle-chat-content" className="battle-chat-content battle-chat-content--terminal">
        {lines.map((line) => {
          const isOpponent = opponentLabel.length > 0
            && line.author.trim().toLowerCase() === opponentLabel;

          if (isOpponent) {
            return (
              <p key={line.id} className="battle-chat__line battle-chat__line--opponent">
                <button
                  type="button"
                  className="battle-chat__avatar"
                  aria-label={`Ver oponente ${line.author}`}
                  title="Ver oponente"
                  onClick={() => handleOpponentClick(line.author)}
                >
                  <span aria-hidden="true">◉</span>
                </button>
                <span className="battle-chat__author battle-chat__author--opponent">
                  {line.author}
                  :
                </span>
                {' '}
                {line.text}
              </p>
            );
          }

          return (
            <p key={line.id} className="battle-chat__line">
              <span className="battle-chat__author">
                {line.author}
                :
              </span>
              {' '}
              {line.text}
            </p>
          );
        })}
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
