import {
  ZONE_BYPASS_DIFFICULTIES,
  SubZoneTransitionId,
  TerminalInitResponse,
  TerminalSubmitResponse,
} from '../types/zoneBypass.js';

interface ActiveTerminalSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly transitionId: SubZoneTransitionId;
  readonly secretCode: string;
  readonly expiresAt: number;
  readonly isResolved: boolean;
}

export class ZoneBypassService {
  private activeSessions = new Map<string, ActiveTerminalSession>();
  private playerLockdowns = new Map<string, number>();
  private playerUnlocks = new Map<string, Set<string>>();

  public isZoneUnlocked(userId: string, targetZone: string): boolean {
    const unlocks = this.playerUnlocks.get(userId);
    return unlocks ? unlocks.has(targetZone) : false;
  }

  public initTerminalSession(userId: string, transitionId: SubZoneTransitionId): TerminalInitResponse {
    const config = ZONE_BYPASS_DIFFICULTIES[transitionId];
    if (!config) {
      throw new Error(`Transição de zona inválida: ${transitionId}`);
    }

    const now = Date.now();
    const lockdownUntil = this.playerLockdowns.get(userId);
    if (lockdownUntil && now < lockdownUntil) {
      const remainingMs = lockdownUntil - now;
      throw new Error(`Terminal em lockdown por falha recente. Tente novamente em ${Math.ceil(remainingMs / 1000)}s.`);
    }

    if (this.isZoneUnlocked(userId, config.toZone)) {
      return {
        sessionId: `unlocked_${now}`,
        transitionId,
        digitCount: config.digitCount,
        displayTimeMs: config.displayTimeMs,
        timeLimitMs: config.timeLimitMs,
        isAlreadyUnlocked: true,
      };
    }

    let secretCode = '';
    for (let i = 0; i < config.digitCount; i += 1) {
      secretCode += Math.floor(Math.random() * 10).toString();
    }

    const sessionId = `term_${userId}_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const session: ActiveTerminalSession = {
      sessionId,
      userId,
      transitionId,
      secretCode,
      expiresAt: now + config.displayTimeMs + config.timeLimitMs,
      isResolved: false,
    };
    this.activeSessions.set(sessionId, session);

    return {
      sessionId,
      transitionId,
      digitCount: config.digitCount,
      displayTimeMs: config.displayTimeMs,
      timeLimitMs: config.timeLimitMs,
      isAlreadyUnlocked: false,
      sequencePreview: secretCode,
    };
  }

  public submitTerminalAnswer(
    sessionId: string,
    userId: string,
    inputCode: string,
    currentLevelExpRequirement: number = 1000,
  ): TerminalSubmitResponse {
    const session = this.activeSessions.get(sessionId);
    const now = Date.now();

    if (!session || session.userId !== userId) {
      return { success: false, errorMessage: 'Sessão de terminal inválida ou expirada.' };
    }
    if (session.isResolved) {
      return { success: false, errorMessage: 'Esta sessão de terminal já foi concluída.' };
    }

    const config = ZONE_BYPASS_DIFFICULTIES[session.transitionId];
    if (now > session.expiresAt) {
      this.triggerFailureLockdown(userId);
      this.activeSessions.delete(sessionId);
      return {
        success: false,
        lockdownDurationMs: 10000,
        errorMessage: 'Tempo esgotado! Terminal travado e alarme acionado.',
      };
    }

    if (inputCode !== session.secretCode) {
      this.triggerFailureLockdown(userId);
      this.activeSessions.delete(sessionId);
      return {
        success: false,
        lockdownDurationMs: 10000,
        errorMessage: 'Código incorreto! Terminal travado por 10s e alarme de ruído ativado.',
      };
    }

    if (!this.playerUnlocks.has(userId)) {
      this.playerUnlocks.set(userId, new Set());
    }
    this.playerUnlocks.get(userId)!.add(config.toZone);
    this.activeSessions.delete(sessionId);

    return {
      success: true,
      expGained: Math.round(currentLevelExpRequirement * 0.40),
      nextZoneUnlocked: config.toZone,
    };
  }

  private triggerFailureLockdown(userId: string): void {
    this.playerLockdowns.set(userId, Date.now() + 10000);
  }
}

export const zoneBypassService = new ZoneBypassService();
