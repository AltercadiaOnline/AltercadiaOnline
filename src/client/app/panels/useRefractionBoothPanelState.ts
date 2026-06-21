import { useCallback, useEffect, useRef, useState } from 'react';
import { REFRACTION_BOOTH_CONFIG } from '../../../shared/cityMinigames/refractionBoothConfig.js';
import { calculateRefractionBoothScore } from '../../../shared/cityMinigames/refractionBoothScore.js';
import type {
  RefractionBoothCompleteSuccess,
  RefractionBoothLeaderboardEntry,
  RefractionBoothQuoteResult,
  RefractionBoothStarted,
} from '../../../shared/cityMinigames/refractionBoothTypes.js';
import { RefractionBoothArenaController } from '../../cityMinigames/refractionBooth/RefractionBoothArenaController.js';
import {
  onRefractionBoothComplete,
  onRefractionBoothQuote,
  onRefractionBoothStarted,
  requestRefractionBoothComplete,
  requestRefractionBoothQuote,
  requestRefractionBoothStart,
} from '../../cityMinigames/refractionBoothClient.js';
import { alertSystem } from '../../ui/alertSystem.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';

export type RefractionBoothView = {
  readonly objectId: string;
  readonly label: string;
};

type SessionState = {
  readonly sessionId: string;
  readonly startedAtMs: number;
  readonly expiresAtMs: number;
};

export type RefractionBoothPhase = 'idle' | 'playing' | 'result';

export function resolveRefractionBoothFromContext(
  context: WorldPanelContext,
): RefractionBoothView {
  if (context.kind === 'refractionBooth') {
    return {
      objectId: context.objectId,
      label: context.label,
    };
  }
  return {
    objectId: 'refraction_booth',
    label: 'Estande de Refração',
  };
}

export function formatRefractionDuration(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function useRefractionBoothPanelState(booth: RefractionBoothView) {
  const [quote, setQuote] = useState<RefractionBoothQuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [phase, setPhase] = useState<RefractionBoothPhase>('idle');
  const [lastResult, setLastResult] = useState<RefractionBoothCompleteSuccess | null>(null);
  const [leaderboard, setLeaderboard] = useState<readonly RefractionBoothLeaderboardEntry[]>([]);
  const [startPending, setStartPending] = useState(false);
  const [failedEarly, setFailedEarly] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [completing, setCompleting] = useState(false);

  const hitTimingsRef = useRef<number[]>([]);
  const arenaControllerRef = useRef<RefractionBoothArenaController | null>(null);
  const timerFrameRef = useRef<number | null>(null);
  const sessionRef = useRef<SessionState | null>(null);
  const phaseRef = useRef<RefractionBoothPhase>('idle');
  const completingRef = useRef(false);
  const failedEarlyRef = useRef(false);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);

  sessionRef.current = session;
  phaseRef.current = phase;
  completingRef.current = completing;
  failedEarlyRef.current = failedEarly;
  hitsRef.current = hits;
  missesRef.current = misses;

  const resetCounters = useCallback(() => {
    hitsRef.current = 0;
    missesRef.current = 0;
    hitTimingsRef.current = [];
    setHits(0);
    setMisses(0);
    setFailedEarly(false);
    failedEarlyRef.current = false;
  }, []);

  const stopLocalSession = useCallback(() => {
    arenaControllerRef.current?.destroy();
    arenaControllerRef.current = null;
    if (timerFrameRef.current !== null) {
      cancelAnimationFrame(timerFrameRef.current);
      timerFrameRef.current = null;
    }
  }, []);

  const requestQuote = useCallback(() => {
    setQuoteLoading(true);
    if (!requestRefractionBoothQuote()) {
      setQuoteLoading(false);
      alertSystem('Conexão indisponível.');
    }
  }, []);

  const finishSession = useCallback(async () => {
    const activeSession = sessionRef.current;
    if (!activeSession || completingRef.current) return;

    setCompleting(true);
    completingRef.current = true;
    stopLocalSession();

    const elapsedMs = Date.now() - activeSession.startedAtMs;
    const minDuration = failedEarlyRef.current
      ? REFRACTION_BOOTH_CONFIG.earlyFailMinDurationMs
      : REFRACTION_BOOTH_CONFIG.minSessionDurationMs;
    const durationMs = Math.max(minDuration, elapsedMs);

    if (!requestRefractionBoothComplete({
      sessionId: activeSession.sessionId,
      hits: hitsRef.current,
      misses: missesRef.current,
      durationMs,
      hitTimings: [...hitTimingsRef.current],
    })) {
      setCompleting(false);
      completingRef.current = false;
      alertSystem('Conexão indisponível ao enviar resultado.');
      setPhase('idle');
      phaseRef.current = 'idle';
      setSession(null);
      sessionRef.current = null;
      requestQuote();
    }
  }, [requestQuote, stopLocalSession]);

  const registerEscapeMiss = useCallback(() => {
    if (!sessionRef.current || phaseRef.current !== 'playing') return;

    const nextMisses = missesRef.current + 1;
    missesRef.current = nextMisses;
    setMisses(nextMisses);

    if (nextMisses >= REFRACTION_BOOTH_CONFIG.maxMisses) {
      failedEarlyRef.current = true;
      setFailedEarly(true);
      void finishSession();
    }
  }, [finishSession]);

  const registerHit = useCallback(() => {
    const activeSession = sessionRef.current;
    if (!activeSession || phaseRef.current !== 'playing') return;

    hitsRef.current += 1;
    hitTimingsRef.current.push(Date.now() - activeSession.startedAtMs);
    setHits(hitsRef.current);
  }, []);

  const mountArena = useCallback((arenaEl: HTMLElement | null) => {
    if (!arenaEl || phaseRef.current !== 'playing') return;

    arenaControllerRef.current?.destroy();
    arenaControllerRef.current = new RefractionBoothArenaController(arenaEl, {
      onHit: registerHit,
      onMiss: registerEscapeMiss,
    });
    arenaControllerRef.current.start();
  }, [registerEscapeMiss, registerHit]);

  const beginLocalSession = useCallback((started: RefractionBoothStarted) => {
    stopLocalSession();
    resetCounters();

    const nextSession: SessionState = {
      sessionId: started.sessionId,
      startedAtMs: Date.now(),
      expiresAtMs: started.expiresAt,
    };

    sessionRef.current = nextSession;
    setSession(nextSession);
    setPhase('playing');
    phaseRef.current = 'playing';
    setRemainingMs(Math.max(0, started.expiresAt - Date.now()));
  }, [resetCounters, stopLocalSession]);

  const startTimerLoop = useCallback(() => {
    const frame = (): void => {
      const activeSession = sessionRef.current;
      if (!activeSession || phaseRef.current !== 'playing' || completingRef.current) return;

      const nextRemaining = Math.max(0, activeSession.expiresAtMs - Date.now());
      setRemainingMs(nextRemaining);

      if (Date.now() >= activeSession.expiresAtMs) {
        void finishSession();
        return;
      }

      timerFrameRef.current = requestAnimationFrame(frame);
    };

    timerFrameRef.current = requestAnimationFrame(frame);
  }, [finishSession]);

  useEffect(() => {
    if (phase !== 'playing' || !session) return;
    startTimerLoop();
    return () => {
      if (timerFrameRef.current !== null) {
        cancelAnimationFrame(timerFrameRef.current);
        timerFrameRef.current = null;
      }
    };
  }, [phase, session, startTimerLoop]);

  useEffect(() => {
    onRefractionBoothQuote((payload) => {
      setQuoteLoading(false);
      if (!payload.ok) {
        alertSystem(payload.reason);
        return;
      }
      setQuote(payload);
      setLeaderboard(payload.leaderboard);
    });

    onRefractionBoothStarted((payload) => {
      setStartPending(false);
      if (!payload.ok) {
        alertSystem(payload.reason);
        setPhase('idle');
        phaseRef.current = 'idle';
        return;
      }
      beginLocalSession(payload);
    });

    onRefractionBoothComplete((payload) => {
      setCompleting(false);
      completingRef.current = false;
      if (!payload.ok) {
        alertSystem(payload.reason);
        setPhase('idle');
        phaseRef.current = 'idle';
        setSession(null);
        sessionRef.current = null;
        requestQuote();
        return;
      }
      setLastResult(payload);
      setLeaderboard(payload.leaderboard);
      setPhase('result');
      phaseRef.current = 'result';
      setSession(null);
      sessionRef.current = null;
    });

    return () => {
      onRefractionBoothQuote(null);
      onRefractionBoothStarted(null);
      onRefractionBoothComplete(null);
      stopLocalSession();
    };
  }, [beginLocalSession, requestQuote, stopLocalSession]);

  const openIdle = useCallback(() => {
    setPhase('idle');
    phaseRef.current = 'idle';
    setLastResult(null);
    setSession(null);
    sessionRef.current = null;
    setStartPending(false);
    resetCounters();
    requestQuote();
  }, [requestQuote, resetCounters]);

  const startFromNpc = useCallback(() => {
    resetCounters();
    setPhase('idle');
    phaseRef.current = 'idle';
    setLastResult(null);
    setSession(null);
    sessionRef.current = null;
    setStartPending(true);

    if (!requestRefractionBoothStart()) {
      setStartPending(false);
      alertSystem('Conexão indisponível.');
    }
  }, [resetCounters]);

  const startFromPanel = useCallback(() => {
    if (!requestRefractionBoothStart()) {
      alertSystem('Conexão indisponível.');
    }
  }, []);

  const backToIdle = useCallback(() => {
    setPhase('idle');
    phaseRef.current = 'idle';
    setLastResult(null);
    requestQuote();
  }, [requestQuote]);

  const score = calculateRefractionBoothScore(hits, misses);

  return {
    booth,
    quote,
    quoteLoading,
    phase,
    lastResult,
    leaderboard,
    startPending,
    failedEarly,
    hits,
    misses,
    score,
    remainingMs,
    completing,
    openIdle,
    startFromNpc,
    startFromPanel,
    backToIdle,
    mountArena,
    requestQuote,
  };
}
