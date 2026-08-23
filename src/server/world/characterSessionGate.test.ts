import { describe, expect, it } from 'vitest';
import { isWebSocketLive, resolveCharacterSessionGate } from './characterSessionGate.js';

describe('resolveCharacterSessionGate', () => {
  it('allows first login', () => {
    expect(
      resolveCharacterSessionGate({
        existingConnectionId: null,
        incomingConnectionId: 'conn-b',
        isExistingLive: false,
      }),
    ).toEqual({ allow: true });
  });

  it('allows re-login on the same connection', () => {
    expect(
      resolveCharacterSessionGate({
        existingConnectionId: 'conn-a',
        incomingConnectionId: 'conn-a',
        isExistingLive: true,
      }),
    ).toEqual({ allow: true });
  });

  it('rejects a second live connection for the same character', () => {
    expect(
      resolveCharacterSessionGate({
        existingConnectionId: 'conn-a',
        incomingConnectionId: 'conn-b',
        isExistingLive: true,
      }),
    ).toEqual({ allow: false, reason: 'ALREADY_ONLINE' });
  });

  it('allows login when the previous connection is stale', () => {
    expect(
      resolveCharacterSessionGate({
        existingConnectionId: 'conn-a',
        incomingConnectionId: 'conn-b',
        isExistingLive: false,
      }),
    ).toEqual({ allow: true, staleConnectionId: 'conn-a' });
  });
});

describe('isWebSocketLive', () => {
  it('treats OPEN and CONNECTING as live', () => {
    expect(isWebSocketLive({ readyState: 1 })).toBe(true);
    expect(isWebSocketLive({ readyState: 0 })).toBe(true);
  });

  it('treats missing or closed sockets as dead', () => {
    expect(isWebSocketLive(null)).toBe(false);
    expect(isWebSocketLive(undefined)).toBe(false);
    expect(isWebSocketLive({ readyState: 3 })).toBe(false);
  });
});
