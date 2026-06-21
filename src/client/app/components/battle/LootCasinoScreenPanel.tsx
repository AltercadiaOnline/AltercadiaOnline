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
import { LootCasinoLever, type LootCasinoLeverHandle } from './LootCasinoLever.js';

type LootCasinoScreenPanelProps = {
  snapshot: LootCasinoHudSnapshot;
};

export function LootCasinoScreenPanel({ snapshot }: LootCasinoScreenPanelProps) {
  const spinHostRef = useRef<HTMLDivElement>(null);
  const leverRef = useRef<LootCasinoLeverHandle>(null);
  const controllerRef = useRef<LootCasinoController | null>(null);

  const [phase, setPhase] = useState<LootCasinoPhase>('idle');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [collectPending, setCollectPending] = useState(false);
  const [collectLabel, setCollectLabel] = useState('Coletar');
  const [blockedHintVisible, setBlockedHintVisible] = useState(false);
  const collectRef = useRef<HTMLButtonElement>(null);

  const slots = snapshot.slots;
  const hint = resolveLootCasinoHintForPhase(phase, slots);

  const syncAnimatingFlag = useCallback((active: boolean) => {
    setIsAnimating(active);
    getLootCasinoHudBridge().setSpinning(active);
  }, []);

  useEffect(() => {
    const host = spinHostRef.current;
    if (!host || slots.length === 0) return;

    setPhase('idle');
    setShowCollect(false);
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
        setShowCollect(true);
        triggerLootCasinoSpinSettled();
      },
    });

    controllerRef.current = controller;
    leverRef.current?.focusHandle();

    return () => {
      controller.destroy();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [slots, snapshot.battleId, syncAnimatingFlag]);

  useEffect(() => {
    if (showCollect) {
      collectRef.current?.focus();
    }
  }, [showCollect]);

  const showBlockedFeedback = useCallback(() => {
    setBlockedHintVisible(true);
    window.setTimeout(() => setBlockedHintVisible(false), 2200);
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
    if (!controller || controller.getPhase() !== 'idle') return;

    void controller.runLootSequence().catch((error) => {
      console.error('[LootCasino] Sequência falhou:', error);
      syncAnimatingFlag(false);
      leverRef.current?.resetHandle();
      setPhase('idle');
    });
  }, [syncAnimatingFlag]);

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
    <div
      className="victory-screen-overlay victory-screen-overlay--casino loot-casino-screen loot-casino-screen--force-viewport"
      role="dialog"
      aria-modal="true"
      aria-label="Recompensas da batalha"
    >
      <div className="victory-screen victory-screen--casino">
        <h2 className="victory-screen__title victory-screen__title--win">Cassino de loot</h2>
        <p className="victory-screen__loot-hint">{hint}</p>
        {blockedHintVisible ? (
          <p className="victory-screen__loot-hint victory-screen__loot-hint--blocked">
            Esperando animação…
          </p>
        ) : null}

        <div ref={spinHostRef} className="victory-screen__spin-host" />

        <LootCasinoLever
          ref={leverRef}
          disabled={phase !== 'idle' || isAnimating}
          onPull={handleLeverPull}
        />

        <div
          className={[
            'battle-decision-actions',
            'loot-casino-screen__actions',
            actionsLocked ? 'loot-casino-screen__actions--locked' : '',
          ].filter(Boolean).join(' ')}
        >
          <button
            type="button"
            className="victory-screen__close loot-casino-screen__exit"
            disabled={actionsLocked}
            onClick={dismissWithoutCollect}
          >
            Sair sem coletar
          </button>
          {showCollect ? (
            <button
              ref={collectRef}
              type="button"
              className="victory-screen__reveal loot-casino-screen__collect"
              disabled={actionsLocked}
              onClick={confirmLoot}
            >
              {collectLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
