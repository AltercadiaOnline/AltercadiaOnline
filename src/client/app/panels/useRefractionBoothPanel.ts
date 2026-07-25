// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState, } from 'react';
import { REFRACTION_BOOTH_CONFIG } from '../../../shared/cityMinigames/refractionBoothConfig.js';
import { calculateRefractionBoothScore } from '../../../shared/cityMinigames/refractionBoothScore.js';
import { RefractionBoothArenaController } from '../../cityMinigames/refractionBooth/RefractionBoothArenaController.js';
import { onRefractionBoothComplete, onRefractionBoothQuote, onRefractionBoothStarted, requestRefractionBoothComplete, requestRefractionBoothQuote, requestRefractionBoothStart, } from '../../cityMinigames/refractionBoothClient.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { buildRefractionBoothBodyHtml, buildRefractionBoothBodyClassName, buildRefractionBoothHeaderHtml, } from '../../ui/cityMinigames/renderRefractionBoothView.js';
import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { getNpcPanelContextBridge } from '../bridge/npcPanelContextBridge.js';
import { closeHudWindow } from './panelWindowActions.js';
const DEFAULT_CONTEXT = {
    objectId: 'refraction_booth',
    label: 'Estande de Refração',
};
const DYNAMIC_LAYOUT_OPTIONS = {
    fitRootSelector: '[data-hud-fit-root]',
    itemSelector: '[data-hud-fit-item]',
    secondarySelector: '[data-hud-fit-secondary]',
    minVisibleItems: 2,
};
function updatePlayingHudStats(root, hits, misses) {
    if (!root)
        return;
    const hud = root.querySelector('.refraction-booth__hud');
    if (!hud)
        return;
    const missLimit = REFRACTION_BOOTH_CONFIG.maxMisses;
    const missEl = hud.querySelector('.refraction-booth__hud-misses');
    if (missEl) {
        missEl.textContent = `Caídos: ${misses}/${missLimit}`;
        missEl.classList.toggle('refraction-booth__hud-misses--danger', misses >= missLimit - 3);
    }
    const spans = hud.querySelectorAll('span');
    if (spans[0])
        spans[0].textContent = `Hits: ${hits}`;
    if (spans[2]) {
        spans[2].textContent = `Score: ${calculateRefractionBoothScore(hits, misses)}`;
    }
}
export function useRefractionBoothPanel(enabled) {
    const bodyRef = useRef(null);
    const arenaControllerRef = useRef(null);
    const timerFrameIdRef = useRef(null);
    const sessionRef = useRef(null);
    const hitsRef = useRef(0);
    const missesRef = useRef(0);
    const hitTimingsRef = useRef([]);
    const failedEarlyRef = useRef(false);
    const completingRef = useRef(false);
    const phaseRef = useRef('idle');
    const lastContextTickRef = useRef(-1);
    const [context, setContext] = useState(DEFAULT_CONTEXT);
    const [quote, setQuote] = useState(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [session, setSession] = useState(null);
    const [hits, setHits] = useState(0);
    const [misses, setMisses] = useState(0);
    const [failedEarly, setFailedEarly] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [startPending, setStartPending] = useState(false);
    const [phase, setPhase] = useState('idle');
    const [lastResult, setLastResult] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [remainingMs, setRemainingMs] = useState(0);
    const [playingBodySeed, setPlayingBodySeed] = useState(0);
    const stopLocalSession = useCallback(() => {
        arenaControllerRef.current?.destroy();
        arenaControllerRef.current = null;
        if (timerFrameIdRef.current !== null) {
            cancelAnimationFrame(timerFrameIdRef.current);
            timerFrameIdRef.current = null;
        }
    }, []);
    const resetCounters = useCallback(() => {
        hitsRef.current = 0;
        missesRef.current = 0;
        hitTimingsRef.current = [];
        failedEarlyRef.current = false;
        setHits(0);
        setMisses(0);
        setFailedEarly(false);
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
        if (!activeSession || completingRef.current)
            return;
        completingRef.current = true;
        setCompleting(true);
        stopLocalSession();
        const elapsedMs = Date.now() - activeSession.startedAtMs;
        const minDuration = failedEarlyRef.current
            ? REFRACTION_BOOTH_CONFIG.earlyFailMinDurationMs
            : REFRACTION_BOOTH_CONFIG.minSessionDurationMs;
        const durationMs = Math.max(minDuration, elapsedMs);
        const payload = {
            sessionId: activeSession.sessionId,
            hits: hitsRef.current,
            misses: missesRef.current,
            durationMs,
            hitTimings: [...hitTimingsRef.current],
        };
        if (!requestRefractionBoothComplete(payload)) {
            completingRef.current = false;
            setCompleting(false);
            alertSystem('Conexão indisponível ao enviar resultado.');
            phaseRef.current = 'idle';
            setPhase('idle');
            sessionRef.current = null;
            setSession(null);
            requestQuote();
        }
    }, [requestQuote, stopLocalSession]);
    const beginLocalSession = useCallback((started) => {
        stopLocalSession();
        resetCounters();
        failedEarlyRef.current = false;
        phaseRef.current = 'playing';
        setPhase('playing');
        setStartPending(false);
        const nextSession = {
            sessionId: started.sessionId,
            startedAtMs: Date.now(),
            expiresAtMs: started.expiresAt,
        };
        sessionRef.current = nextSession;
        setSession(nextSession);
        setRemainingMs(Math.max(0, started.expiresAt - Date.now()));
        setPlayingBodySeed((seed) => seed + 1);
    }, [resetCounters, stopLocalSession]);
    const registerEscapeMiss = useCallback(() => {
        if (!sessionRef.current || phaseRef.current !== 'playing')
            return;
        missesRef.current += 1;
        setMisses(missesRef.current);
        updatePlayingHudStats(bodyRef.current, hitsRef.current, missesRef.current);
        if (missesRef.current >= REFRACTION_BOOTH_CONFIG.maxMisses) {
            failedEarlyRef.current = true;
            setFailedEarly(true);
            void finishSession();
        }
    }, [finishSession]);
    const registerHit = useCallback(() => {
        if (!sessionRef.current || phaseRef.current !== 'playing')
            return;
        hitsRef.current += 1;
        hitTimingsRef.current.push(Date.now() - sessionRef.current.startedAtMs);
        setHits(hitsRef.current);
        updatePlayingHudStats(bodyRef.current, hitsRef.current, missesRef.current);
    }, []);
    const resetPanelSession = useCallback(() => {
        stopLocalSession();
        phaseRef.current = 'idle';
        completingRef.current = false;
        sessionRef.current = null;
        setPhase('idle');
        setLastResult(null);
        setSession(null);
        setStartPending(false);
        setCompleting(false);
        resetCounters();
    }, [resetCounters, stopLocalSession]);
    const viewModel = useMemo(() => ({
        context,
        phase,
        quote,
        quoteLoading,
        startPending,
        completing,
        hits,
        misses,
        failedEarly,
        remainingMs,
        lastResult,
        leaderboard,
    }), [
        completing,
        context,
        failedEarly,
        hits,
        lastResult,
        leaderboard,
        misses,
        phase,
        quote,
        quoteLoading,
        remainingMs,
        startPending,
    ]);
    const bodyHtml = useMemo(() => {
        if (phase === 'playing') {
            return buildRefractionBoothBodyHtml({
                ...viewModel,
                hits: 0,
                misses: 0,
            });
        }
        return buildRefractionBoothBodyHtml(viewModel);
    }, [phase, playingBodySeed, viewModel]);
    const bodyClassName = useMemo(() => buildRefractionBoothBodyClassName(viewModel), [viewModel]);
    const headerMeta = useMemo(() => buildRefractionBoothHeaderHtml(viewModel), [viewModel]);
    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);
    useEffect(() => {
        if (!enabled)
            return;
        return getNpcPanelContextBridge().subscribe((snapshot) => {
            if (!snapshot.refractionBooth)
                return;
            if (snapshot.refractionBoothTick === lastContextTickRef.current)
                return;
            lastContextTickRef.current = snapshot.refractionBoothTick;
            const ctx = { ...snapshot.refractionBooth };
            resetPanelSession();
            setContext(ctx);
            if (ctx.npcChallenge) {
                setStartPending(true);
                if (!requestRefractionBoothStart()) {
                    setStartPending(false);
                    alertSystem('Conexão indisponível.');
                    closeHudWindow('refractionBooth');
                }
                return;
            }
            requestQuote();
        });
    }, [enabled, requestQuote, resetPanelSession]);
    useEffect(() => {
        if (!enabled)
            return;
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
                if (phaseRef.current !== 'playing') {
                    closeHudWindow('refractionBooth');
                }
                return;
            }
            beginLocalSession(payload);
        });
        onRefractionBoothComplete((payload) => {
            completingRef.current = false;
            setCompleting(false);
            if (!payload.ok) {
                alertSystem(payload.reason);
                phaseRef.current = 'idle';
                setPhase('idle');
                sessionRef.current = null;
                setSession(null);
                requestQuote();
                return;
            }
            setLastResult(payload);
            setLeaderboard(payload.leaderboard);
            phaseRef.current = 'result';
            setPhase('result');
        });
        return () => {
            onRefractionBoothQuote(null);
            onRefractionBoothStarted(null);
            onRefractionBoothComplete(null);
        };
    }, [beginLocalSession, enabled, requestQuote]);
    useEffect(() => {
        if (!enabled)
            return;
        return () => {
            stopLocalSession();
            const snapshot = endWorldHudInteractionSession();
            if (snapshot) {
                uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
            }
        };
    }, [enabled, stopLocalSession]);
    useEffect(() => {
        if (!enabled || phase !== 'playing')
            return;
        let cancelled = false;
        let retryFrameId = 0;
        let controller = null;
        const mountArena = () => {
            if (cancelled)
                return;
            const arena = bodyRef.current?.querySelector('[data-refraction-arena]');
            if (!arena) {
                retryFrameId = requestAnimationFrame(mountArena);
                return;
            }
            arenaControllerRef.current?.destroy();
            controller = new RefractionBoothArenaController(arena, {
                onHit: registerHit,
                onMiss: registerEscapeMiss,
            });
            controller.start();
            arenaControllerRef.current = controller;
        };
        retryFrameId = requestAnimationFrame(mountArena);
        return () => {
            cancelled = true;
            cancelAnimationFrame(retryFrameId);
            controller?.destroy();
            if (controller && arenaControllerRef.current === controller) {
                arenaControllerRef.current = null;
            }
        };
    }, [bodyHtml, enabled, phase, playingBodySeed, registerEscapeMiss, registerHit]);
    useEffect(() => {
        if (!enabled || phase !== 'playing' || !session)
            return;
        const tick = () => {
            const activeSession = sessionRef.current;
            if (!activeSession || phaseRef.current !== 'playing' || completingRef.current)
                return;
            if (Date.now() >= activeSession.expiresAtMs) {
                void finishSession();
                return;
            }
            setRemainingMs(Math.max(0, activeSession.expiresAtMs - Date.now()));
            timerFrameIdRef.current = requestAnimationFrame(tick);
        };
        timerFrameIdRef.current = requestAnimationFrame(tick);
        return () => {
            if (timerFrameIdRef.current !== null) {
                cancelAnimationFrame(timerFrameIdRef.current);
                timerFrameIdRef.current = null;
            }
        };
    }, [enabled, finishSession, phase, session?.sessionId]);
    const handleClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        if (target.dataset.action === 'close') {
            closeHudWindow('refractionBooth');
            return;
        }
        if (target.dataset.action === 'start') {
            if (!requestRefractionBoothStart()) {
                alertSystem('Conexão indisponível.');
            }
            return;
        }
        if (target.dataset.action === 'back') {
            phaseRef.current = 'idle';
            setPhase('idle');
            setLastResult(null);
            requestQuote();
        }
    }, [requestQuote]);
    return {
        viewModel,
        bodyHtml,
        bodyClassName,
        headerMeta,
        bodyRef,
        dynamicLayoutOptions: DYNAMIC_LAYOUT_OPTIONS,
        handleClick,
    };
}
