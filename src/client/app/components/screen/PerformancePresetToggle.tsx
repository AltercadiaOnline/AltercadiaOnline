import { useSyncExternalStore } from 'react';
import {
  getPerformanceMode,
  setPerformanceChoice,
  subscribePerformanceMode,
} from '../../../runtime/performancePreset.js';

type PerformancePresetToggleProps = {
  readonly className?: string;
  readonly hint?: boolean;
};

export function PerformancePresetToggle({
  className,
  hint = false,
}: PerformancePresetToggleProps) {
  const mode = useSyncExternalStore(
    subscribePerformanceMode,
    getPerformanceMode,
    getPerformanceMode,
  );
  const lite = mode === 'lite';

  return (
    <span className={`perf-preset ${className ?? ''}`.trim()}>
      <button
        type="button"
        className="perf-preset-toggle"
        aria-pressed={lite}
        aria-label={lite ? 'Desempenho Leve. Clique para Normal.' : 'Desempenho Normal. Clique para Leve.'}
        onClick={() => setPerformanceChoice(lite ? 'full' : 'lite')}
      >
        Desempenho: {lite ? 'Leve' : 'Normal'}
      </button>
      {hint ? (
        <span className="perf-preset__hint">PC fraco? use Leve — corta blur e animações.</span>
      ) : null}
    </span>
  );
}
