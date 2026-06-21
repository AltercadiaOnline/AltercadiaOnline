import { useRef } from 'react';
import { useWorldMinimap } from '../../../hooks/useWorldMinimap.js';

type WorldMinimapPanelProps = {
  readonly interactive?: boolean;
};

export function WorldMinimapPanel({ interactive = true }: WorldMinimapPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useWorldMinimap(canvasRef, interactive);

  return (
    <div className="sidebar-minimap" aria-label="Minimapa">
      <canvas
        ref={canvasRef}
        className="sidebar-minimap__canvas"
        aria-label={interactive ? 'Minimapa do mundo — clique para mover' : 'Minimapa do mundo'}
        role="img"
        style={interactive ? undefined : { pointerEvents: 'none' }}
      />
    </div>
  );
}
