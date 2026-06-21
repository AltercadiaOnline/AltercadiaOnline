/**
 * BattleLog — log de combate; estado canônico em battleHudStore (React).
 */
import type { BattleNarrativeLine } from './BattleNarrator.js';
import {
  BATTLE_LOG_EMITTER_CLASS,
  type BattleLogEmitter,
} from './battleLogColors.js';
import { getBattleHudBridge } from '../../app/bridge/battleHudBridge.js';

export { LOG_COLORS } from './battleLogColors.js';

export const BATTLE_LOG_MAX_MESSAGES = 10;

export type BattleLogProps = {
  readonly messages?: readonly string[];
  readonly maxMessages?: number;
};

export type BattleLogEntry = BattleNarrativeLine;

/** Mantém só as últimas `max` entradas (útil para testes e sync externo). */
export function trimBattleLogMessages<T>(
  messages: readonly T[],
  max = BATTLE_LOG_MAX_MESSAGES,
): T[] {
  if (max <= 0) return [];
  return messages.length <= max ? [...messages] : messages.slice(-max);
}

export class BattleLog {
  private readonly maxMessages: number;
  private entries: BattleLogEntry[] = [];

  constructor(_container?: HTMLElement | null, props: BattleLogProps = {}) {
    this.maxMessages = props.maxMessages ?? BATTLE_LOG_MAX_MESSAGES;
    if (props.messages?.length) {
      this.setMessages(props.messages);
    }
  }

  setMessages(messages: readonly string[]): void {
    this.entries = trimBattleLogMessages(
      messages.map((text) => ({ text, emitter: 'SYSTEM' as const, tone: 'neutral' as const })),
      this.maxMessages,
    );
    getBattleHudBridge().clearLogLines();
    for (const entry of this.entries) {
      this.pushToStore(entry);
    }
  }

  appendNarrative(entry: BattleLogEntry): void {
    this.entries = trimBattleLogMessages([...this.entries, entry], this.maxMessages);
    this.pushToStore(entry);
  }

  append(line: string): void {
    this.appendNarrative({ text: line, emitter: 'SYSTEM', tone: 'neutral' });
  }

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
    getBattleHudBridge().clearLogLines();
  }

  private pushToStore(entry: BattleLogEntry): void {
    getBattleHudBridge().appendLogLine({
      text: entry.text,
      emitter: entry.emitter,
      ...(entry.tone !== undefined ? { tone: entry.tone } : {}),
      ...(entry.kind !== undefined ? { kind: entry.kind } : {}),
    });
  }
}

export function emitterMessageClass(emitter: BattleLogEmitter): string {
  const key = emitter.toLowerCase() as keyof typeof BATTLE_LOG_EMITTER_CLASS;
  return BATTLE_LOG_EMITTER_CLASS[key];
}
