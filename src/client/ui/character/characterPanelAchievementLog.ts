import {
  formatOperativeEventTimestamp,
  formatOperativeTerminalEvent,
  selectOperativeEventEntries,
} from '../../../shared/world/worldLoreTerminal.js';
import type { WorldLoreEntry } from '../../../shared/world/worldLoreTypes.js';

export type OperativeEventLogLine = {
  readonly timestamp: string;
  readonly message: string;
};

export function buildOperativeEventLogLines(
  entries: readonly WorldLoreEntry[],
  now = Date.now(),
  maxLines = 3,
): readonly OperativeEventLogLine[] {
  return selectOperativeEventEntries(entries, maxLines).map((entry) => ({
    timestamp: formatOperativeEventTimestamp(entry.occurredAt, now),
    message: formatOperativeTerminalEvent(entry),
  }));
}

export function renderOperativeEventLog(lines: readonly OperativeEventLogLine[]): string {
  if (lines.length === 0) {
    return `
      <li class="character-event-log__line character-event-log__line--empty">
        <span class="character-event-log__prompt">&gt;</span>
        <span class="character-event-log__text">Nenhum evento registrado.</span>
      </li>
    `;
  }

  return lines
    .map(
      (line) => `
      <li class="character-event-log__line">
        <span class="character-event-log__prompt">&gt;</span>
        <span class="character-event-log__stamp">[${line.timestamp}]</span>
        <span class="character-event-log__text">${line.message}</span>
      </li>
    `,
    )
    .join('');
}
