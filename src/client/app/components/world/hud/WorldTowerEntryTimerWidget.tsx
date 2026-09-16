import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  getTowerPanelMirror,
  subscribeTowerPanelMirror,
} from '../../../../world/towerPanelMirror.js';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';

/**
 * Chip ao lado do SINAL — countdown da janela de entrada da party.
 */
export function WorldTowerEntryTimerWidget() {
  const snapshot = useSyncExternalStore(
    (onChange) =>
      subscribeExternalStore(
        (listener) => subscribeTowerPanelMirror(() => listener()),
        onChange,
      ),
    () => getTowerPanelMirror(),
    () => null,
  );

  const endsAt = snapshot?.party?.run?.entryWindowEndsAtServerMs ?? null;
  const rosterLocked = Boolean(snapshot?.party?.run?.rosterLocked);
  const membersInRun = snapshot?.party?.run?.membersInRun?.length ?? 0;
  const membersTotal = snapshot?.party?.members?.length ?? 0;

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt || rosterLocked) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt, rosterLocked]);

  if (!endsAt || rosterLocked || endsAt <= nowMs) return null;

  const secondsLeft = Math.max(0, Math.ceil((endsAt - nowMs) / 1000));
  const ratioLabel = membersTotal > 0 ? `${membersInRun}/${membersTotal}` : `${membersInRun}`;

  return (
    <div
      className="ui-tower-entry-timer ui-skin-hybrid"
      data-ui-widget="tower-entry-timer"
      aria-live="polite"
      aria-label={`Janela da Torre ${secondsLeft} segundos, ${ratioLabel} dentro`}
      style={{
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 56,
        padding: '4px 8px',
        border: '1px solid rgba(126, 207, 138, 0.55)',
        background: 'linear-gradient(180deg, rgba(28, 42, 30, 0.92), rgba(14, 22, 16, 0.92))',
        color: '#b8f5c4',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        lineHeight: 1.15,
        textTransform: 'uppercase',
      }}
    >
      <span>TORRE</span>
      <span style={{ fontSize: 14, color: '#e8ffe8' }}>{secondsLeft}s</span>
      <span style={{ opacity: 0.85, fontSize: 10, fontWeight: 600 }}>{ratioLabel}</span>
    </div>
  );
}
