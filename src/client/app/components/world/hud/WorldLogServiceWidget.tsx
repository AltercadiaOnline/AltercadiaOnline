import { SystemMessageKind } from '../../../../../shared/world/logServiceTypes.js';
import {
  formatWorldHudLogLine,
  getWorldHudBridge,
} from '../../../bridge/worldHudBridge.js';
import { useWorldHudBridge } from '../../../hooks/useWorldHudBridge.js';
import { useEffect, useRef, useState } from 'react';

export function WorldLogServiceWidget() {
  const { logLines, logUnreadCount } = useWorldHudBridge();
  const [expanded, setExpanded] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || !expanded) return;
    feed.scrollTop = feed.scrollHeight;
  }, [logLines, expanded]);

  const toggleExpanded = (): void => {
    const next = !expanded;
    setExpanded(next);
    getWorldHudBridge().setLogPanelExpanded(next);
  };

  return (
    <div
      className={`log-service-panel ${expanded ? '' : 'log-service-panel--collapsed'}`}
      data-ui-widget="world-log"
    >
      <div className="log-service-panel__header">
        <span className="log-service-panel__title">Log do Sistema</span>
        <button
          type="button"
          className="log-service-panel__toggle"
          aria-expanded={expanded}
          aria-controls="world-log-service-feed"
          data-unread={logUnreadCount > 0 ? String(logUnreadCount) : undefined}
          onClick={toggleExpanded}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>
      <div
        id="world-log-service-feed"
        ref={feedRef}
        className="log-service__feed"
        role="log"
        aria-live="polite"
        aria-label="Mensagens do sistema"
      >
        {logLines.map((line) => (
          <p
            key={line.id}
            className={`log-service__line ${
              line.kind === SystemMessageKind.SYSTEM_TIP
                ? 'log-service__line--tip'
                : 'log-service__line--notify'
            }`}
          >
            {formatWorldHudLogLine(line)}
          </p>
        ))}
      </div>
    </div>
  );
}
