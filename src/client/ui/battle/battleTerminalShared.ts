/** Tokens compartilhados do tema Dark Terminal (combate). */
export const BATTLE_TERMINAL_THEME = {
  neon: '#deff9a',
  neonDim: 'rgba(222, 255, 154, 0.35)',
  bg: '#060806',
  panel: 'rgba(10, 13, 10, 0.72)',
  text: '#deff9a',
  textDim: '#8fa86e',
  mono: "'Consolas', 'Courier New', 'Lucida Console', monospace",
} as const;

export function formatLogTimestamp(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
