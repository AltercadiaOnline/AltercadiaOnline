import { describe, expect, it } from 'vitest';
import { isChatWhisperPayload, whisperPeerKey } from './chatWhisperTypes.js';

describe('chatWhisperTypes', () => {
  it('aceita payload ao vivo e recusa texto vazio', () => {
    const ok = {
      fromPlayerId: 'a',
      fromCharacterId: 1,
      fromDisplayName: 'A',
      toPlayerId: 'b',
      toCharacterId: 2,
      toDisplayName: 'B',
      text: 'oi',
      sentAt: 1,
    };
    expect(isChatWhisperPayload(ok)).toBe(true);
    expect(isChatWhisperPayload({ ...ok, text: '' })).toBe(false);
    expect(whisperPeerKey('b', 2)).toBe('b:2');
  });
});
