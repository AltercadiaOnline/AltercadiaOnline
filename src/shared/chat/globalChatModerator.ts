import { CHAT_GLOBAL_INAPPROPRIATE_MESSAGE, type ChatModerationResult } from './chatModerationConstants.js';
import {
  compactForModeration,
  moderationTextVariants,
  normalizeSpacedForModeration,
} from './chatTextNormalization.js';
import { DEFAULT_GAME_BANNED_WORDS } from './gameBannedWords.js';

/**
 * Filtro de chat (browser-safe) — lista customizada + anti-leetspeak.
 * Profanidade via bad-words roda só no servidor (`globalChatModeratorServer.ts`).
 */
export class GlobalChatModerator {
  private readonly gameBannedWords = new Set<string>();

  constructor(initialGameWords: readonly string[] = DEFAULT_GAME_BANNED_WORDS) {
    this.setGameBannedWords(initialGameWords);
  }

  /** Substitui a lista customizada do jogo (normalizada em minúsculas). */
  setGameBannedWords(words: readonly string[]): void {
    this.gameBannedWords.clear();
    for (const word of words) {
      const normalized = word.trim().toLowerCase();
      if (normalized) this.gameBannedWords.add(normalized);
    }
  }

  addGameBannedWords(...words: readonly string[]): void {
    for (const word of words) {
      const normalized = word.trim().toLowerCase();
      if (normalized) this.gameBannedWords.add(normalized);
    }
  }

  removeGameBannedWords(...words: readonly string[]): void {
    for (const word of words) {
      const normalized = word.trim().toLowerCase();
      if (normalized) this.gameBannedWords.delete(normalized);
    }
  }

  getGameBannedWords(): readonly string[] {
    return [...this.gameBannedWords];
  }

  validate(text: string): ChatModerationResult {
    const trimmed = text.trim();
    if (!trimmed) {
      return { ok: false, reason: CHAT_GLOBAL_INAPPROPRIATE_MESSAGE };
    }

    if (this.matchesGameBannedTerm(trimmed)) {
      return { ok: false, reason: CHAT_GLOBAL_INAPPROPRIATE_MESSAGE };
    }

    return { ok: true };
  }

  /** Variantes normalizadas — reutilizado pelo moderador do servidor. */
  moderationVariants(text: string): readonly string[] {
    return moderationTextVariants(text);
  }

  private matchesGameBannedTerm(text: string): boolean {
    if (this.gameBannedWords.size === 0) return false;

    const compact = compactForModeration(text);
    const spaced = normalizeSpacedForModeration(text);

    for (const term of this.gameBannedWords) {
      const termCompact = compactForModeration(term);
      const termSpaced = normalizeSpacedForModeration(term);

      if (termCompact && compact.includes(termCompact)) return true;
      if (termSpaced && spaced.includes(termSpaced)) return true;
      if (compact.includes(term)) return true;
      if (spaced.includes(term)) return true;
    }

    return false;
  }
}

let sharedModerator: GlobalChatModerator | null = null;

export function getGlobalChatModerator(): GlobalChatModerator {
  if (!sharedModerator) {
    sharedModerator = new GlobalChatModerator();
  }
  return sharedModerator;
}

/** Testes — reinicia singleton. */
export function resetGlobalChatModeratorForTests(): void {
  sharedModerator = null;
}
