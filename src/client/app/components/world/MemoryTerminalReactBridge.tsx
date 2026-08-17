import React, { useCallback, useEffect, useState } from 'react';
import { uiEvents, UIEventType } from '../../../ui/uiEvents.js';
import { SubZoneTransitionId } from '../../../../shared/types/zoneBypass.js';
import { MemoryTerminalModal } from '../../../components/minigames/MemoryTerminalModal.js';
import { ZoneDomainHud } from '../../../components/minigames/ZoneDomainHud.js';
import { zoneBypassService } from '../../../../shared/world/zoneBypassStore.js';
import { postSystemNotification } from '../../../ui/logService.js';
import { hideInteractionCard } from '../../../world/interactionCardController.js';
import { registerMemoryTerminalHudCloser } from '../../../world/memoryTerminalHudBridge.js';
import { releaseWorldHudInteractionIfIdle } from '../../../world/worldHudInteractionSession.js';
import { getActiveCharacterIdentity } from '../../../character/activeCharacterIdentity.js';

const ZONE_BYPASS_LOCAL_USER_ID = 'local_player';

type TerminalOverlay =
  | {
      readonly kind: 'minigame';
      readonly transitionId: SubZoneTransitionId;
      readonly sessionId: string;
      readonly sequencePreview: string;
      readonly displayTimeMs: number;
      readonly timeLimitMs: number;
    }
  | {
      readonly kind: 'domain';
      readonly zoneName: string;
    };

function dismissMemoryTerminalHud(): void {
  hideInteractionCard();
  releaseWorldHudInteractionIfIdle();
}

function resolveBypassDisplayName(): string {
  return getActiveCharacterIdentity()?.displayName ?? 'Operative';
}

function beginMinigame(transitionId: SubZoneTransitionId): TerminalOverlay | null {
  const initData = zoneBypassService.initTerminalSession(ZONE_BYPASS_LOCAL_USER_ID, transitionId);
  if (initData.isAlreadyUnlocked) {
    return null;
  }
  return {
    kind: 'minigame',
    transitionId,
    sessionId: initData.sessionId,
    sequencePreview: initData.sequencePreview || '1234',
    displayTimeMs: initData.displayTimeMs,
    timeLimitMs: initData.timeLimitMs,
  };
}

/**
 * Overlay do terminal da zona 1. Tem de viver fora de WorldPanelsLayer:
 * aquela camada retorna null sem painel aberto, então o evento SHOW_MEMORY_TERMINAL
 * se perdia e a trava de exploração ficava permanente.
 */
export const MemoryTerminalReactBridge: React.FC = () => {
  const [overlay, setOverlay] = useState<TerminalOverlay | null>(null);

  const closeSession = useCallback(() => {
    setOverlay(null);
    dismissMemoryTerminalHud();
  }, []);

  useEffect(() => {
    registerMemoryTerminalHudCloser(overlay ? closeSession : null);
    return () => {
      registerMemoryTerminalHudCloser(null);
    };
  }, [overlay, closeSession]);

  useEffect(() => {
    const unsubscribe = uiEvents.on(
      UIEventType.SHOW_MEMORY_TERMINAL,
      (payload: { transitionId: SubZoneTransitionId; zoneName: string }) => {
        try {
          const snapshot = zoneBypassService.getDomainSnapshot(ZONE_BYPASS_LOCAL_USER_ID);
          const firstLaneUnlocked = snapshot.lanes[0]?.unlocked === true;
          if (firstLaneUnlocked) {
            setOverlay({ kind: 'domain', zoneName: payload.zoneName });
            return;
          }

          const minigame = beginMinigame(payload.transitionId);
          if (!minigame) {
            setOverlay({ kind: 'domain', zoneName: payload.zoneName });
            return;
          }
          setOverlay(minigame);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          postSystemNotification(message);
          dismissMemoryTerminalHud();
        }
      },
    );

    return () => unsubscribe();
  }, []);

  const handleHackNext = useCallback(() => {
    const snapshot = zoneBypassService.getDomainSnapshot(ZONE_BYPASS_LOCAL_USER_ID);
    if (!snapshot.nextTransitionId) return;
    try {
      const minigame = beginMinigame(snapshot.nextTransitionId);
      if (!minigame) {
        setOverlay((prev) => (prev?.kind === 'domain' ? prev : { kind: 'domain', zoneName: 'Zona 1' }));
        return;
      }
      setOverlay(minigame);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      postSystemNotification(message);
    }
  }, []);

  if (!overlay) return null;

  if (overlay.kind === 'domain') {
    const snapshot = zoneBypassService.getDomainSnapshot(ZONE_BYPASS_LOCAL_USER_ID);
    return (
      <ZoneDomainHud
        zoneName={overlay.zoneName}
        snapshot={snapshot}
        onClose={closeSession}
        onHackNext={snapshot.nextTransitionId ? handleHackNext : null}
      />
    );
  }

  const handleSubmit = (inputCode: string) => {
    const result = zoneBypassService.submitTerminalAnswer(
      overlay.sessionId,
      ZONE_BYPASS_LOCAL_USER_ID,
      inputCode,
      1000,
      resolveBypassDisplayName(),
    );

    closeSession();

    if (result.success) {
      postSystemNotification(
        `Bypass ok — ${result.nextZoneUnlocked} liberada. E no terminal abre o domínio.`,
      );
    } else {
      postSystemNotification(`Falha no terminal: ${result.errorMessage || 'Lockdown 10s.'}`);
    }
  };

  return (
    <MemoryTerminalModal
      transitionId={overlay.transitionId}
      sequencePreview={overlay.sequencePreview}
      displayTimeMs={overlay.displayTimeMs}
      timeLimitMs={overlay.timeLimitMs}
      onClose={closeSession}
      onSubmit={handleSubmit}
    />
  );
};
