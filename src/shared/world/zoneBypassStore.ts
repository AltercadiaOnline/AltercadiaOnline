import {
  ZONE_BYPASS_DIFFICULTIES,
  SUB_ZONE_TRANSITION_ORDER,
  SubZoneTransitionId,
  TerminalInitResponse,
  TerminalSubmitResponse,
  ZoneDomainSnapshot,
} from '../types/zoneBypass.js';

interface ZoneHolderRecord {
  readonly userId: string;
  readonly displayName: string;
  readonly unlockedAtMs: number;
}

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
  /** Primeiro bypass bem-sucedido da subzona — “quem está dominando”. */
  private zoneHolders = new Map<string, ZoneHolderRecord>();

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

  public getDomainSnapshot(userId: string, nowMs: number = Date.now()): ZoneDomainSnapshot {
    const unlocks = this.playerUnlocks.get(userId) ?? new Set<string>();
    const lockdownUntil = this.playerLockdowns.get(userId) ?? 0;
    const lanes = SUB_ZONE_TRANSITION_ORDER.map((transitionId) => {
      const config = ZONE_BYPASS_DIFFICULTIES[transitionId];
      const holder = this.zoneHolders.get(config.toZone);
      return {
        transitionId,
        fromZone: config.fromZone,
        toZone: config.toZone,
        digitCount: config.digitCount,
        displayTimeMs: config.displayTimeMs,
        unlocked: unlocks.has(config.toZone),
        holderName: holder?.displayName ?? null,
      };
    });
    const next = lanes.find((lane) => !lane.unlocked) ?? null;
    return {
      unlockedZones: [...unlocks],
      lanes,
      nextTransitionId: next?.transitionId ?? null,
      lockdownRemainingMs: Math.max(0, lockdownUntil - nowMs),
    };
  }

  public submitTerminalAnswer(
    sessionId: string,
    userId: string,
    inputCode: string,
    currentLevelExpRequirement: number = 1000,
    holderDisplayName?: string,
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
    if (!this.zoneHolders.has(config.toZone)) {
      const name = holderDisplayName?.trim();
      this.zoneHolders.set(config.toZone, {
        userId,
        displayName: name && name.length > 0 ? name : userId,
        unlockedAtMs: now,
      });
    }
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
