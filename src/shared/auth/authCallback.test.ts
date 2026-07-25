// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { isGameSessionPath, isSpaClientPath } from './authCallback.js';
describe('authCallback SPA paths', () => {
    it('isGameSessionPath — só /game (não módulos estáticos em /game/*)', () => {
        expect(isGameSessionPath('/game')).toBe(true);
        expect(isGameSessionPath('/game/')).toBe(true);
        expect(isGameSessionPath('/game/constants/GameConfig.js')).toBe(false);
        expect(isGameSessionPath('/game/assets/assetNormalizer.js')).toBe(false);
    });
    it('isSpaClientPath — assets /game/* não são SPA', () => {
        expect(isSpaClientPath('/game/constants/GameConfig.js')).toBe(false);
        expect(isSpaClientPath('/game')).toBe(true);
        expect(isSpaClientPath('/characters')).toBe(true);
    });
});
