import { useRef } from 'react';
import { useWorldMinimap } from '../../../hooks/useWorldMinimap.js';

type WorldMinimapPanelProps = {
  readonly interactive?: boolean;
};

/** Radar CRT tático — topo da sidebar (varredura leve, sem texturas). */
export function WorldMinimapPanel({ interactive = true }: WorldMinimapPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useWorldMinimap(canvasRef, interactive);

  return (
    <div className="sidebar-minimap sidebar-minimap--crt" aria-label="Radar tático">
      <canvas
        ref={canvasRef}
        className="sidebar-minimap__canvas"
        aria-label={interactive ? 'Radar do mundo — clique para mover' : 'Radar do mundo'}
        role="img"
        style={interactive ? undefined : { pointerEvents: 'none' }}
      />
      <span className="sidebar-minimap__crt-scan" aria-hidden="true" />
      <span className="sidebar-minimap__crt-vignette" aria-hidden="true" />
    </div>
  );
}
