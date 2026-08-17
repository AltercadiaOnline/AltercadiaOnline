import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  createLootCasinoController,
  type LootCasinoController,
  type LootCasinoPhase,
} from '../../../ui/battle/LootCasinoController.js';
import { resolveLootCasinoHintForPhase } from '../../../ui/battle/lootCasinoView.js';
import {
  runLootCasinoConfirm,
  triggerLootCasinoDismiss,
  triggerLootCasinoSpinSettled,
} from '../../battle/lootCasinoSessionHandlers.js';
import { getLootCasinoHudBridge } from '../../bridge/lootCasinoHudBridge.js';
import type { LootCasinoHudSnapshot } from '../../bridge/lootCasinoHudBridge.js';
import { LootCasinoFrame } from './LootCasinoFrame.js';
import { LootCasinoLever, type LootCasinoLeverHandle } from './LootCasinoLever.js';
import { bindDelegatedItemTooltip } from '../../../ui/tooltip/itemHoverTooltip.js';
import { hideGameTooltip } from '../../../ui/tooltip/showGameTooltip.js';

type LootCasinoScreenPanelProps = {
  snapshot: LootCasinoHudSnapshot;
};

export function LootCasinoScreenPanel({ snapshot }: LootCasinoScreenPanelProps) {
  const spinHostRef = useRef<HTMLDivElement>(null);
  const leverRef = useRef<LootCasinoLeverHandle>(null);
  const controllerRef = useRef<LootCasinoController | null>(null);
  const blockedTimerRef = useRef(0);
  const pendingAutoRunRef = useRef(false);

  const [phase, setPhase] = useState<LootCasinoPhase>('idle');
  const [spinIndex, setSpinIndex] = useState(0);
  const [remainingSpins, setRemainingSpins] = useState(() => Math.max(1, snapshot.spinCount || 1));
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [collectPending, setCollectPending] = useState(false);
  const [collectLabel, setCollectLabel] = useState('Coletar');
  const [blockedHintVisible, setBlockedHintVisible] = useState(false);
  const collectRef = useRef<HTMLButtonElement>(null);

  const reveals = snapshot.lootReveals.length > 0
    ? snapshot.lootReveals
    : [snapshot.slots];
  const spinCount = Math.max(1, snapshot.spinCount || reveals.length);
  const clampedIndex = Math.min(spinIndex, spinCount - 1);
  const slots = reveals[clampedIndex] ?? snapshot.slots;
  const hint = resolveLootCasinoHintForPhase(phase, slots, {
    index: clampedIndex,
    count: spinCount,
  });

  const syncAnimatingFlag = useCallback((active: boolean) => {
    setIsAnimating(active);
    getLootCasinoHudBridge().setSpinning(active);
  }, []);

  useEffect(() => {
    setSpinIndex(0);
    setShowCollect(false);
    pendingAutoRunRef.current = false;
    setRemainingSpins(Math.max(1, snapshot.spinCount || 1));
  }, [snapshot.battleId, snapshot.lootId, snapshot.spinCount]);

  useEffect(() => {
    const host = spinHostRef.current;
    if (!host || slots.length === 0) return;

    setPhase('idle');
    setCollectPending(false);
    setCollectLabel('Coletar');

    const controller = createLootCasinoController({
      slots,
      spinHost: host,
      pullLever: () => leverRef.current?.playPullAnimation() ?? Promise.resolve(),
      onPhaseChange: (nextPhase) => {
        setPhase(nextPhase);
        const animating = nextPhase === 'lever_pull' || nextPhase === 'spinning';
        syncAnimatingFlag(animating);
      },
      onReady: () => {
        syncAnimatingFlag(false);
        triggerLootCasinoSpinSettled();
        if (clampedIndex + 1 >= spinCount) {
          setShowCollect(true);
        }
      },
    });

    controllerRef.current = controller;
    leverRef.current?.focusHandle();

    if (pendingAutoRunRef.current) {
      pendingAutoRunRef.current = false;
      void controller.runLootSequence().catch((error) => {
        console.error('[LootCasino] Sequência falhou:', error);
        syncAnimatingFlag(false);
        leverRef.current?.resetHandle();
        setPhase('idle');
      });
    }

    const unbindTooltip = bindDelegatedItemTooltip(host);

    return () => {
      unbindTooltip();
      hideGameTooltip();
      controller.destroy();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [slots, snapshot.battleId, snapshot.lootId, clampedIndex, spinCount, syncAnimatingFlag]);

  useEffect(() => {
    if (showCollect) {
      collectRef.current?.focus();
    }
  }, [showCollect]);

  useEffect(() => () => window.clearTimeout(blockedTimerRef.current), []);

  const showBlockedFeedback = useCallback(() => {
    setBlockedHintVisible(true);
    window.clearTimeout(blockedTimerRef.current);
    blockedTimerRef.current = window.setTimeout(() => setBlockedHintVisible(false), 2200);
  }, []);

  const finishScreen = useCallback(() => {
    syncAnimatingFlag(false);
    getLootCasinoHudBridge().dismiss();
  }, [syncAnimatingFlag]);

  const dismissWithoutCollect = useCallback(() => {
    if (isAnimating || collectPending) {
      showBlockedFeedback();
      return;
    }
    triggerLootCasinoDismiss();
    finishScreen();
  }, [collectPending, finishScreen, isAnimating, showBlockedFeedback]);

  const confirmLoot = useCallback(() => {
    if (isAnimating || collectPending) {
      showBlockedFeedback();
      return;
    }
    setCollectPending(true);
    setCollectLabel('Coletando…');
    void runLootCasinoConfirm()
      .then((result) => {
        if (result === false) {
          setCollectPending(false);
          setCollectLabel('Coletar');
          return;
        }
        finishScreen();
      })
      .catch((error) => {
        console.error('[LootCasino] Coleta falhou:', error);
        setCollectPending(false);
        setCollectLabel('Coletar');
      });
  }, [collectPending, finishScreen, isAnimating, showBlockedFeedback]);

  const handleLeverPull = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    if (controller.getPhase() === 'ready' && clampedIndex + 1 < spinCount) {
      setRemainingSpins((current) => Math.max(0, current - 1));
      pendingAutoRunRef.current = true;
      leverRef.current?.resetHandle();
      setShowCollect(false);
      setSpinIndex((current) => current + 1);
      return;
    }

    if (controller.getPhase() !== 'idle') return;

    setRemainingSpins((current) => Math.max(0, current - 1));
    void controller.runLootSequence().catch((error) => {
      console.error('[LootCasino] Sequência falhou:', error);
      syncAnimatingFlag(false);
      leverRef.current?.resetHandle();
      setPhase('idle');
    });
  }, [clampedIndex, spinCount, syncAnimatingFlag]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismissWithoutCollect();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dismissWithoutCollect]);

  const actionsLocked = isAnimating || collectPending;

  return (
    <LootCasinoFrame role="dialog" ariaLabel="Recompensas da batalha" ariaModal>
      <h2 className="loot-casino-screen__title">Recompensas</h2>
      <p className="loot-casino-screen__hint">{hint}</p>
      {blockedHintVisible ? (
        <p className="loot-casino-screen__hint loot-casino-screen__hint--blocked">
          Esperando animação…
        </p>
      ) : null}

      <div ref={spinHostRef} className="loot-casino-screen__spin-host" />

      <LootCasinoLever
        ref={leverRef}
        disabled={(phase !== 'idle' && phase !== 'ready') || isAnimating || showCollect}
        remainingSpins={remainingSpins}
        onPull={handleLeverPull}
      />

      <div
        className={[
          'loot-casino-screen__actions',
          actionsLocked ? 'loot-casino-screen__actions--locked' : '',
        ].filter(Boolean).join(' ')}
      >
        <button
          type="button"
          className="loot-casino-screen__exit"
          disabled={actionsLocked}
          onClick={dismissWithoutCollect}
        >
          Sair sem coletar
        </button>
        {showCollect ? (
          <button
            ref={collectRef}
            type="button"
            className="loot-casino-screen__collect"
            disabled={actionsLocked}
            onClick={confirmLoot}
          >
            {collectLabel}
          </button>
        ) : null}
      </div>
    </LootCasinoFrame>
  );
}
