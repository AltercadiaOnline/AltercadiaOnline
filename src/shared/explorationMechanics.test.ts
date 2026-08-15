import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneBypassService } from './world/zoneBypassStore.js';
import { TacticalSprayService } from './social/tacticalSprayStore.js';

describe('Mecânica 1: Bypass de Zona (Escalonamento de Memória)', () => {
  let bypassService: ZoneBypassService;

  beforeEach(() => {
    bypassService = new ZoneBypassService();
  });

  it('deve gerar sequências com número correto de dígitos por zona', () => {
    const sessionZ1 = bypassService.initTerminalSession('user_1', 'Z1_TO_Z1A');
    expect(sessionZ1.sequencePreview).toHaveLength(4);

    const sessionZ1A = bypassService.initTerminalSession('user_2', 'Z1A_TO_Z1B');
    expect(sessionZ1A.sequencePreview).toHaveLength(6);

    const sessionZ1B = bypassService.initTerminalSession('user_3', 'Z1B_TO_Z1C');
    expect(sessionZ1B.sequencePreview).toHaveLength(8);

    const sessionZ1C = bypassService.initTerminalSession('user_4', 'Z1C_TO_Z1D');
    expect(sessionZ1C.sequencePreview).toHaveLength(12);
  });

  it('deve conceder 40% de EXP e destravar a zona permanentemente em caso de sucesso', () => {
    const session = bypassService.initTerminalSession('user_winner', 'Z1_TO_Z1A');
    const secretCode = session.sequencePreview!;

    const result = bypassService.submitTerminalAnswer(session.sessionId, 'user_winner', secretCode, 1000);
    expect(result.success).toBe(true);
    expect(result.expGained).toBe(400); // 40% de 1000
    expect(result.nextZoneUnlocked).toBe('Z1A');

    // Passagens futuras devem ser instantâneas sem mini-game
    expect(bypassService.isZoneUnlocked('user_winner', 'Z1A')).toBe(true);
  });

  it('deve aplicar lockdown e falhar em caso de código incorreto', () => {
    const session = bypassService.initTerminalSession('user_fail', 'Z1_TO_Z1A');
    const result = bypassService.submitTerminalAnswer(session.sessionId, 'user_fail', '000000000');

    expect(result.success).toBe(false);
    expect(result.lockdownDurationMs).toBe(10000);

    // Tentar iniciar nova sessão deve ser bloqueado por lockdown
    expect(() => bypassService.initTerminalSession('user_fail', 'Z1_TO_Z1A')).toThrow(/lockdown/i);
  });
});

describe('Mecânica 2: Spray Tático (Sinalização Assíncrona & Hub Social)', () => {
  let sprayService: TacticalSprayService;

  beforeEach(() => {
    sprayService = new TacticalSprayService();
  });

  it('deve permitir colocar um spray no chão e sobrescrever se for nas mesmas coordenadas', () => {
    sprayService.placeSpray(
      { userId: 'player_1', zoneId: 'Z1', posX: 10, posY: 20, sprayAssetId: 'spray_alerta_binario' },
      'CyberKnight'
    );

    let sprays = sprayService.getSpraysInZone('Z1');
    expect(sprays).toHaveLength(1);
    expect(sprays[0]?.sprayAssetId).toBe('spray_alerta_binario');

    // Sobrescrever nas mesmas coordenadas pelo mesmo jogador
    sprayService.placeSpray(
      { userId: 'player_1', zoneId: 'Z1', posX: 10, posY: 20, sprayAssetId: 'spray_terminal_hackeado' },
      'CyberKnight'
    );

    sprays = sprayService.getSpraysInZone('Z1');
    expect(sprays).toHaveLength(1);
    expect(sprays[0]?.sprayAssetId).toBe('spray_terminal_hackeado');
  });

  it('deve contabilizar upvotes, recompensar com Volts/Reputação e gerar feed social', () => {
    const spray = sprayService.placeSpray(
      { userId: 'author_1', zoneId: 'Z1', posX: 15, posY: 25, sprayAssetId: 'spray_vigilante' },
      'ZoneLeader'
    );

    const upvoteResult = sprayService.upvoteSpray(spray.id, 'interator_1', 'ScoutPlayer');
    expect(upvoteResult.success).toBe(true);
    expect(upvoteResult.voltsRewarded).toBe(15);
    expect(upvoteResult.reputationRewarded).toBe(5);

    const feed = sprayService.getPlayerSocialFeed('author_1');
    expect(feed).toHaveLength(1);
    expect(feed[0]?.totalUpvotes).toBe(1);
    expect(feed[0]?.interactions[0]?.interatorNickname).toBe('ScoutPlayer');
  });

  it('deve ter exatamente os 3 sprays disponíveis no catálogo do NPC Mercenário', async () => {
    const { getNpcVendorListings } = await import('./economy/npcVendorCatalog.js');
    const { getAuthoritativeItemById } = await import('./items/itemCatalogAuthoritative.js');

    const spray1 = getAuthoritativeItemById('spray_terminal_hackeado');
    const spray2 = getAuthoritativeItemById('spray_alerta_binario');
    const spray3 = getAuthoritativeItemById('spray_vigilante');

    expect(spray1?.name).toContain('Terminal Hackeado');
    expect(spray2?.name).toContain('Alerta Binário');
    expect(spray3?.name).toContain('Vigilante');

    const mercenarioListings = getNpcVendorListings('mercenario');
    expect(mercenarioListings).toHaveLength(3);
    expect(mercenarioListings.some((l) => l.itemId === 'spray_terminal_hackeado')).toBe(true);
    expect(mercenarioListings.some((l) => l.itemId === 'spray_alerta_binario')).toBe(true);
    expect(mercenarioListings.some((l) => l.itemId === 'spray_vigilante')).toBe(true);
  });
});
