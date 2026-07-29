import { useEffect, useState } from 'react';
import {
  LAG_BAD_RTT_MS,
  LAG_WARN_RTT_MS,
  getMovementNetTelemetry,
  type MovementNetSnapshot,
} from '../../../../world/movementNetTelemetry.js';

function lagLabelFromSnapshot(snapshot: MovementNetSnapshot): string | null {
  const rtt = snapshot.rttMs;
  if (rtt === null) return null;
  if (rtt >= LAG_BAD_RTT_MS) return 'Rede lenta';
  if (rtt >= LAG_WARN_RTT_MS) return 'Sincronizando…';
  return null;
}

/**
 * Feedback honesto de lag — nunca trava WASD.
 * Só aparece com RTT elevado (amostra do round-trip de MOVE_INTENT).
 */
export function WorldNetLagWidget() {
  const [snapshot, setSnapshot] = useState<MovementNetSnapshot>(() =>
    getMovementNetTelemetry().getSnapshot(),
  );

  useEffect(() => {
    return getMovementNetTelemetry().subscribe(setSnapshot);
  }, []);

  const label = lagLabelFromSnapshot(snapshot);
  if (!label) return null;

  return (
    <div
      className="world-net-lag-hint ui-skin-hybrid"
      role="status"
      aria-live="polite"
      title={snapshot.rttMs != null ? `RTT ~${Math.round(snapshot.rttMs)}ms` : undefined}
      style={{
        pointerEvents: 'none',
        alignSelf: 'center',
        padding: '0.2rem 0.45rem',
        fontSize: '0.65rem',
        letterSpacing: '0.04em',
        color: 'rgba(255, 220, 160, 0.92)',
        border: '1px solid rgba(200, 150, 80, 0.35)',
        background: 'rgba(20, 14, 8, 0.72)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );
}
