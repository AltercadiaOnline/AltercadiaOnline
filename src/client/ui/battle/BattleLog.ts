/**
 * BattleLog — log de combate estilo terminal com cores por emissor.
 *
 * Formato: [Timestamp] [Mensagem colorida]
 * Emissores: PLAYER (azul), ENEMY (vermelho), SYSTEM (amarelo)
 */
import { formatLogTimestamp } from './battleTerminalShared.js';
import type { BattleNarrativeLine } from './BattleNarrator.js';
import {
  applyBattleLogColorTokens,
  BATTLE_LOG_EMITTER_CLASS,
  type BattleLogEmitter,
} from './battleLogColors.js';
import { getBattleHudBridge, isReactBattleHudEnabled } from '../../app/bridge/battleHudBridge.js';

export { LOG_COLORS } from './battleLogColors.js';

export const BATTLE_LOG_MAX_MESSAGES = 10;

export type BattleLogProps = {
  readonly messages?: readonly string[];
  readonly maxMessages?: number;
};

export type BattleLogEntry = BattleNarrativeLine;

function emitterMessageClass(emitter: BattleLogEmitter): string {
  const key = emitter.toLowerCase() as keyof typeof BATTLE_LOG_EMITTER_CLASS;
  return BATTLE_LOG_EMITTER_CLASS[key];
}

/** Mantém só as últimas `max` entradas (útil para testes e sync externo). */
export function trimBattleLogMessages<T>(
  messages: readonly T[],
  max = BATTLE_LOG_MAX_MESSAGES,
): T[] {
  if (max <= 0) return [];
  return messages.length <= max ? [...messages] : messages.slice(-max);
}

export class BattleLog {
  private readonly root: HTMLElement | null;
  private readonly maxMessages: number;
  private entries: BattleLogEntry[] = [];

  constructor(container: HTMLElement | null | undefined, props: BattleLogProps = {}) {
    this.root = container ?? null;
    this.maxMessages = props.maxMessages ?? BATTLE_LOG_MAX_MESSAGES;
    if (this.root) {
      this.root.classList.add('battle-log', 'battle-log--mono', 'battle-log--terminal');
      applyBattleLogColorTokens(this.root);
    }
    if (props.messages?.length) {
      this.setMessages(props.messages);
    }
  }

  /** Atualiza a prop `messages` — recorta para as últimas N e faz scroll. */
  setMessages(messages: readonly string[]): void {
    this.entries = trimBattleLogMessages(
      messages.map((text) => ({ text, emitter: 'SYSTEM' as const, tone: 'neutral' as const })),
      this.maxMessages,
    );
    this.render();
  }

  /** Adiciona linha narrativa com emissor visual (player / enemy / system). */
  appendNarrative(entry: BattleLogEntry): void {
    this.entries = trimBattleLogMessages([...this.entries, entry], this.maxMessages);
    if (isReactBattleHudEnabled()) {
      getBattleHudBridge().appendLogLine({
        text: entry.text,
        emitter: entry.emitter,
        ...(entry.tone !== undefined ? { tone: entry.tone } : {}),
        ...(entry.kind !== undefined ? { kind: entry.kind } : {}),
      });
    }
    this.render();
  }

  /** Adiciona uma linha de sistema respeitando o limite de mensagens. */
  append(line: string): void {
    this.appendNarrative({ text: line, emitter: 'SYSTEM', tone: 'neutral' });
  }

  /** Alerta crítico — aviso de sistema (amarelo + pulso). */
  appendAlert(line: string): void {
    this.appendNarrative({ text: line, emitter: 'SYSTEM', tone: 'alert' });
  }

  getMessages(): readonly string[] {
    return this.entries.map((entry) => entry.text);
  }

  getEntries(): readonly BattleLogEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries = [];
    if (this.root) this.root.innerHTML = '';
    if (isReactBattleHudEnabled()) {
      getBattleHudBridge().resetSession();
    }
  }

  private render(): void {
    if (!this.root) return;

    const doc = this.root.ownerDocument;
    this.root.innerHTML = '';

    for (const entry of this.entries) {
      const row = doc.createElement('div');
      row.className = 'battle-log__line';
      if (entry.tone === 'alert') {
        row.classList.add('battle-log__line--alert');
      }

      const timestamp = doc.createElement('span');
      timestamp.className = 'battle-log__timestamp';
      timestamp.textContent = `[${formatLogTimestamp()}] `;

      const message = doc.createElement('span');
      message.className = `battle-log__message ${emitterMessageClass(entry.emitter)}`;
      if (entry.kind === 'formula') {
        message.classList.add('battle-log__message--formula');
      }
      message.textContent = entry.text;

      row.append(timestamp, message);
      this.root.appendChild(row);
    }

    this.root.scrollTop = this.root.scrollHeight;
  }
}
