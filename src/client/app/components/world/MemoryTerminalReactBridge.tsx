import React, { useCallback, useEffect, useRef, useState } from 'react';
import { uiEvents, UIEventType } from '../../../ui/uiEvents.js';
import { SubZoneTransitionId, ZONE_BYPASS_DIFFICULTIES } from '../../../../shared/types/zoneBypass.js';
import type { TerminalInitResponse } from '../../../../shared/types/zoneBypass.js';
import { MemoryTerminalModal } from '../../../components/minigames/MemoryTerminalModal.js';
import { ZoneDomainHud } from '../../../components/minigames/ZoneDomainHud.js';
import {
  getZoneDomainTerminalById,
  getZoneDomainTerminalByTransition,
} from '../../../../shared/world/zoneDomainTerminals.js';
import { postSystemNotification } from '../../../ui/logService.js';
import { hideInteractionCard } from '../../../world/interactionCardController.js';
import { registerMemoryTerminalHudCloser } from '../../../world/memoryTerminalHudBridge.js';
import { releaseWorldHudInteractionIfIdle } from '../../../world/worldHudInteractionSession.js';
import { PENDING_INTENT_TIMEOUT_MS } from '../../../ActionDispatcher.js';
import { UI_LAYER_Z_INDEX } from '../../shell/uiLayers.js';
import {
  onZoneBypassInit,
  onZoneBypassSubmit,
  readZoneDomainSnapshot,
  requestZoneBypassInit,
  requestZoneBypassSubmit,
} from '../../../world/zoneBypassClient.js';

type TerminalOverlay =
  | {
      readonly kind: 'booting';
      readonly transitionId: SubZoneTransitionId;
      readonly terminalId: string;
      readonly zoneName: string;
    }
  | {
      readonly kind: 'minigame';
      readonly transitionId: SubZoneTransitionId;
      readonly terminalId: string;
      readonly zoneName: string;
      readonly sessionId: string;
      readonly sequencePreview: string;
      readonly displayTimeMs: number;
      readonly timeLimitMs: number;
    }
  | {
      readonly kind: 'domain';
      readonly zoneName: string;
      readonly terminalId: string;
      readonly transitionId: SubZoneTransitionId;
    };

function dismissMemoryTerminalHud(): void {
  hideInteractionCard();
  releaseWorldHudInteractionIfIdle();
}

function nextGateHint(transitionId: SubZoneTransitionId): string | null {
  const order = ['Z1_TO_Z1A', 'Z1A_TO_Z1B', 'Z1B_TO_Z1C', 'Z1C_TO_Z1D'] as const;
  const idx = order.indexOf(transitionId);
  if (idx < 0 || idx >= order.length - 1) return null;
  const nextTransition = order[idx + 1]!;
  const nextTerminal = getZoneDomainTerminalByTransition(nextTransition);
  const nextConfig = ZONE_BYPASS_DIFFICULTIES[nextTransition];
  if (!nextTerminal || !nextConfig) return null;
  return `Próxima trava (${nextConfig.fromZone} → ${nextConfig.toZone}): use o ${nextTerminal.label} dentro de ${nextTerminal.residesInZone}.`;
}

function openMinigameFromInit(
  gate: { readonly transitionId: SubZoneTransitionId; readonly terminalId: string; readonly label: string },
  initData: TerminalInitResponse,
  setOverlay: React.Dispatch<React.SetStateAction<TerminalOverlay | null>>,
): void {
  if (initData.isAlreadyUnlocked) {
    setOverlay({
      kind: 'domain',
      zoneName: gate.label,
      terminalId: gate.terminalId,
      transitionId: gate.transitionId,
    });
    return;
  }
  setOverlay({
    kind: 'minigame',
    transitionId: gate.transitionId,
    terminalId: gate.terminalId,
    zoneName: gate.label,
    sessionId: initData.sessionId,
    sequencePreview: initData.sequencePreview || '1234',
    displayTimeMs: initData.displayTimeMs,
    timeLimitMs: initData.timeLimitMs,
  });
}

function TerminalBootOverlay(props: {
  readonly zoneName: string;
  readonly onClose: () => void;
}): React.ReactElement {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: UI_LAYER_Z_INDEX.overlay,
        pointerEvents: 'auto',
        fontFamily: `'Inter', 'Roboto', sans-serif`,
      }}
    >
      <div
        style={{
          width: 'min(420px, 92vw)',
          backgroundColor: '#0a0d14',
          border: '2px solid #00f0ff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.25)',
          color: '#e2e8f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#00f0ff', letterSpacing: 1 }}>
            TERMINAL // {props.zoneName}
          </h2>
          <button
            type="button"
            onClick={props.onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: '18px 0 8px', color: '#00f0ff', fontSize: 14 }}>Ligando…</p>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>Aguardando sessão do servidor.</p>
      </div>
    </div>
  );
}

/**
 * Overlay dos terminais de domínio (cadeia por subzona). Fora de WorldPanelsLayer.
 */
export const MemoryTerminalReactBridge: React.FC = () => {
  const [overlay, setOverlay] = useState<TerminalOverlay | null>(null);
  const [domainRevision, setDomainRevision] = useState(0);
  const overlayRef = useRef<TerminalOverlay | null>(null);
  overlayRef.current = overlay;

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
    if (!overlay || overlay.kind !== 'booting') return;
    const handle = window.setTimeout(() => {
      postSystemNotification('Terminal não respondeu. Tente novamente.');
      closeSession();
    }, PENDING_INTENT_TIMEOUT_MS + 400);
    return () => window.clearTimeout(handle);
  }, [overlay, closeSession]);

  useEffect(() => {
    onZoneBypassInit((payload) => {
      if ('ok' in payload && payload.ok === false) {
        postSystemNotification(payload.reason);
        setOverlay(null);
        dismissMemoryTerminalHud();
        return;
      }
      const initData = payload as TerminalInitResponse;
      const gate = getZoneDomainTerminalByTransition(initData.transitionId);
      if (!gate) {
        postSystemNotification('Terminal de domínio desconhecido.');
        setOverlay(null);
        dismissMemoryTerminalHud();
        return;
      }
      openMinigameFromInit(gate, initData, setOverlay);
    });
    onZoneBypassSubmit((payload) => {
      if ('ok' in payload && payload.ok === false) {
        postSystemNotification(payload.reason);
        return;
      }
      if ('success' in payload && payload.success) {
        setDomainRevision((value) => value + 1);
        const transitionId = overlayRef.current?.transitionId;
        const hint = transitionId ? nextGateHint(transitionId) : null;
        postSystemNotification(
          hint
            ? `Bypass ok — ${payload.nextZoneUnlocked} liberada. ${hint}`
            : `Bypass ok — ${payload.nextZoneUnlocked} liberada.`,
        );
      } else if ('errorMessage' in payload) {
        postSystemNotification(`Falha no terminal: ${payload.errorMessage || 'Lockdown 10s.'}`);
      }
    });
    return () => {
      onZoneBypassInit(null);
      onZoneBypassSubmit(null);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = uiEvents.on(
      UIEventType.SHOW_MEMORY_TERMINAL,
      (payload: {
        transitionId: SubZoneTransitionId;
        zoneName: string;
        terminalId: string;
      }) => {
        const gate =
          getZoneDomainTerminalById(payload.terminalId) ??
          getZoneDomainTerminalByTransition(payload.transitionId);
        if (!gate) {
          postSystemNotification('Terminal de domínio desconhecido.');
          setOverlay(null);
          dismissMemoryTerminalHud();
          return;
        }

        const current = overlayRef.current;
        if (current && (current.kind === 'booting' || current.kind === 'minigame')) {
          return;
        }

        setOverlay({
          kind: 'booting',
          transitionId: gate.transitionId,
          terminalId: gate.terminalId,
          zoneName: gate.label,
        });

        const started = requestZoneBypassInit(gate.transitionId);
        if (!started) {
          postSystemNotification('Não foi possível iniciar o terminal — tente novamente.');
          setOverlay(null);
          dismissMemoryTerminalHud();
        }
      },
    );

    return () => unsubscribe();
  }, []);

  const handleHackThisGate = useCallback(() => {
    if (!overlay || overlay.kind !== 'domain') return;
    if (!requestZoneBypassInit(overlay.transitionId)) {
      postSystemNotification('Não foi possível iniciar o hack desta trava.');
    }
  }, [overlay]);

  if (!overlay) return null;

  if (overlay.kind === 'booting') {
    return <TerminalBootOverlay zoneName={overlay.zoneName} onClose={closeSession} />;
  }

  if (overlay.kind === 'domain') {
    void domainRevision;
    const snapshot = readZoneDomainSnapshot(overlay.transitionId);
    if (!snapshot) {
      return (
        <ZoneDomainHud
          zoneName={overlay.zoneName}
          snapshot={{
            unlockedZones: [],
            lanes: [],
            nextTransitionId: overlay.transitionId,
            lockdownRemainingMs: 0,
          }}
          boundTransitionId={overlay.transitionId}
          nextTerminalHint={null}
          onClose={closeSession}
          onHackNext={handleHackThisGate}
        />
      );
    }
    const thisUnlocked = snapshot.lanes.some(
      (lane) => lane.transitionId === overlay.transitionId && lane.unlocked,
    );
    return (
      <ZoneDomainHud
        zoneName={overlay.zoneName}
        snapshot={snapshot}
        boundTransitionId={overlay.transitionId}
        nextTerminalHint={thisUnlocked ? nextGateHint(overlay.transitionId) : null}
        onClose={closeSession}
        onHackNext={snapshot.nextTransitionId ? handleHackThisGate : null}
      />
    );
  }

  const handleSubmit = (inputCode: string) => {
    closeSession();
    if (!requestZoneBypassSubmit(overlay.sessionId, inputCode)) {
      postSystemNotification('Não foi possível enviar o código — tente novamente.');
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
