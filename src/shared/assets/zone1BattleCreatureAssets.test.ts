import { describe, expect, it } from 'vitest';
import { resolveZone1BattleSpriteUrl } from './zone1BattleCreatureAssets.js';
import { resolveZone1TopDownRotationUrl } from './zone1TopDownCreatureAssets.js';

describe('resolveZone1BattleSpriteUrl', () => {
  it('agente Vórtex usa o PNG top-down olhando à esquerda (west)', () => {
    const west = resolveZone1TopDownRotationUrl('vortex_agent', 'west');
    expect(west).toContain('/west.png');
    expect(resolveZone1BattleSpriteUrl('vortex_agent')).toBe(west);
  });

  it('rato continua no PNG side-view da pasta de batalha', () => {
    expect(resolveZone1BattleSpriteUrl('rat')).toBe(
      '/assets/creatures/zona1_tela_de_batalha/rato_sprite_telabatalha.png',
    );
  });
});
