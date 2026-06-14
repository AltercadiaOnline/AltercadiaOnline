/**
 * BattleChat — chat de batalha com input local e callback onSendMessage.
 */
import { escapeHtml } from './battleTerminalShared.js';

export type BattleChatMessage = {
  readonly author: string;
  readonly text: string;
};

export type BattleChatProps = {
  readonly onSendMessage: (message: string) => void;
  readonly localAuthor?: string;
  readonly messages?: readonly BattleChatMessage[];
  /** Rótulo do oponente — habilita avatar clicável no chat pós-duelo. */
  readonly opponentAuthorLabel?: string | null;
  readonly onOpponentAuthorClick?: (author: string) => void;
};

export class BattleChat {
  private readonly section: HTMLElement | null;
  private readonly content: HTMLElement | null;
  private readonly form: HTMLFormElement | null;
  private readonly input: HTMLInputElement | null;
  private props: BattleChatProps;
  private inputValue = '';
  private offSubmit: (() => void) | null = null;
  private offInput: (() => void) | null = null;
  private offContentClick: (() => void) | null = null;

  constructor(root: ParentNode, props: BattleChatProps) {
    this.props = props;
    this.section = root.querySelector('#battle-chat');
    this.content = root.querySelector('#battle-chat-content');
    this.form = root.querySelector('#battle-chat-form');
    this.input = root.querySelector('#battle-chat-input');

    this.section?.classList.add('battle-chat--terminal');
    this.content?.classList.add('battle-chat-content--terminal');
    this.bindInputState();
    this.bindSubmit();
    this.bindContentClicks();

    if (props.messages?.length) {
      for (const entry of props.messages) {
        this.append(entry.text, entry.author);
      }
    }
  }

  configureOpponentAuthor(
    opponentAuthorLabel: string | null | undefined,
    onOpponentAuthorClick?: (author: string) => void,
  ): void {
    this.props = {
      ...this.props,
      opponentAuthorLabel: opponentAuthorLabel ?? null,
      ...(onOpponentAuthorClick ? { onOpponentAuthorClick } : {}),
    };
  }

  getInputValue(): string {
    return this.inputValue;
  }

  setInputValue(value: string): void {
    this.inputValue = value;
    if (this.input) this.input.value = value;
  }

  append(message: string, author = 'SYS'): void {
    if (!this.content) return;
    const row = this.content.ownerDocument.createElement('p');
    row.className = 'battle-chat__line';

    const opponentLabel = this.props.opponentAuthorLabel?.trim().toLowerCase() ?? '';
    const authorNormalized = author.trim().toLowerCase();
    const isOpponentAuthor = opponentLabel.length > 0 && authorNormalized === opponentLabel;

    if (isOpponentAuthor) {
      row.className = 'battle-chat__line battle-chat__line--opponent';
      row.setAttribute('data-action-menu-kind', 'battle-opponent');
      row.setAttribute('data-action-menu-target', JSON.stringify({ author }));
      row.innerHTML = `
        <button type="button" class="battle-chat__avatar" data-opponent-author="${escapeHtml(author)}" aria-label="Ver oponente ${escapeHtml(author)}" title="Ver oponente">
          <span aria-hidden="true">◉</span>
        </button>
        <span class="battle-chat__author battle-chat__author--opponent">${escapeHtml(author)}</span>
        ${escapeHtml(message)}
      `;
    } else {
      row.innerHTML = `<span class="battle-chat__author">${escapeHtml(author)}</span> ${escapeHtml(message)}`;
    }

    this.content.appendChild(row);
    this.content.scrollTop = this.content.scrollHeight;
  }

  clear(): void {
    if (this.content) this.content.innerHTML = '';
    this.setInputValue('');
  }

  destroy(): void {
    this.offSubmit?.();
    this.offSubmit = null;
    this.offInput?.();
    this.offInput = null;
    this.offContentClick?.();
    this.offContentClick = null;
  }

  private bindInputState(): void {
    if (!this.input) return;

    const syncFromDom = () => {
      this.inputValue = this.input!.value;
    };

    this.input.addEventListener('input', syncFromDom);
    this.offInput = () => this.input?.removeEventListener('input', syncFromDom);
  }

  private bindSubmit(): void {
    if (!this.form || !this.input) return;

    const handler = (event: Event) => {
      event.preventDefault();
      const text = this.inputValue.trim();
      if (!text) return;

      this.setInputValue('');
      this.append(text, this.props.localAuthor ?? 'YOU');
      this.props.onSendMessage(text);
    };

    this.form.addEventListener('submit', handler);
    this.offSubmit = () => this.form?.removeEventListener('submit', handler);
  }

  private bindContentClicks(): void {
    if (!this.content) return;

    const handler = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const avatar = target?.closest<HTMLButtonElement>('[data-opponent-author]');
      if (!avatar?.dataset.opponentAuthor) return;
      this.props.onOpponentAuthorClick?.(avatar.dataset.opponentAuthor);
    };

    this.content.addEventListener('click', handler);
    this.offContentClick = () => this.content?.removeEventListener('click', handler);
  }
}
