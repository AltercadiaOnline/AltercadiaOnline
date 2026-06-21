/**
 * BattleChat — chat de batalha; estado canônico em battleHudStore (React).
 */
import { getBattleHudBridge } from '../../app/bridge/battleHudBridge.js';

export type BattleChatMessage = {
  readonly author: string;
  readonly text: string;
};

export type BattleChatProps = {
  readonly onSendMessage: (message: string) => void;
  readonly localAuthor?: string;
  readonly messages?: readonly BattleChatMessage[];
  readonly opponentAuthorLabel?: string | null;
  readonly onOpponentAuthorClick?: (author: string) => void;
};

export class BattleChat {
  private props: BattleChatProps;

  constructor(_root: ParentNode, props: BattleChatProps) {
    this.props = props;

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
    return '';
  }

  setInputValue(_value: string): void {
    /* input vive no React */
  }

  append(message: string, author = 'SYS'): void {
    getBattleHudBridge().appendChatLine(author, message);
  }

  clear(): void {
    getBattleHudBridge().clearChatLines();
  }

  sendLocalMessage(message: string): void {
    const text = message.trim();
    if (!text) return;
    this.append(text, this.props.localAuthor ?? 'YOU');
    this.props.onSendMessage(text);
  }

  destroy(): void {
    /* noop */
  }
}
