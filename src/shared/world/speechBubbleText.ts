import { SPEECH_BUBBLE_MAX_TEXT_CHARS } from './speechBubbleConstants.js';

/** Normaliza texto enviado ao chat global e exibido no balão. */
export function normalizeSpeechBubbleText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, SPEECH_BUBBLE_MAX_TEXT_CHARS);
}
