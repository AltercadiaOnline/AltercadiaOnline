import React, { useState, useEffect } from 'react';
import { uiEvents, UIEventType } from '../../../ui/uiEvents.js';
import { SubZoneTransitionId } from '../../../../shared/types/zoneBypass.js';
import { MemoryTerminalModal } from '../../../components/minigames/MemoryTerminalModal.js';
import { zoneBypassService } from '../../../../shared/world/zoneBypassStore.js';
import { postSystemNotification } from '../../../ui/logService.js';

export const MemoryTerminalReactBridge: React.FC = () => {
  const [activeSession, setActiveSession] = useState<{
    transitionId: SubZoneTransitionId;
    sessionId: string;
    sequencePreview: string;
    timeLimitMs: number;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = uiEvents.on(UIEventType.SHOW_MEMORY_TERMINAL, (payload: { transitionId: SubZoneTransitionId; zoneName: string }) => {
      try {
        const userId = 'local_player';
        const initData = zoneBypassService.initTerminalSession(userId, payload.transitionId);

        if (initData.isAlreadyUnlocked) {
          postSystemNotification(`Acesso instantâneo! A zona ${payload.zoneName} já está desbloqueada.`);
          return;
        }

        setActiveSession({
          transitionId: payload.transitionId,
          sessionId: initData.sessionId,
          sequencePreview: initData.sequencePreview || '1234',
          timeLimitMs: initData.timeLimitMs,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        postSystemNotification(message);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!activeSession) return null;

  const handleSubmit = (inputCode: string) => {
    const userId = 'local_player';
    const result = zoneBypassService.submitTerminalAnswer(
      activeSession.sessionId,
      userId,
      inputCode,
      1000
    );

    setActiveSession(null);

    if (result.success) {
      postSystemNotification(
        `🏆 SUCESSO NO BYPASS! Acesso liberado para a zona ${result.nextZoneUnlocked}! +${result.expGained} EXP concedida (40% do nível).`
      );
    } else {
      postSystemNotification(`❌ FALHA NO TERMINAL: ${result.errorMessage || 'Lockdown ativado por 10s.'}`);
    }
  };

  return (
    <MemoryTerminalModal
      transitionId={activeSession.transitionId}
      sequencePreview={activeSession.sequencePreview}
      timeLimitMs={activeSession.timeLimitMs}
      onClose={() => setActiveSession(null)}
      onSubmit={handleSubmit}
    />
  );
};
