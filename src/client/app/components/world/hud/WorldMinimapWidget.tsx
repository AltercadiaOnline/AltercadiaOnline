import { useEffect, useRef } from 'react';
import { SidebarMinimap } from '../../../../ui/components/SidebarMinimap.js';

export function WorldMinimapWidget() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const minimap = SidebarMinimap.mount(host);
    minimap.attach();
    return () => {
      minimap.detach();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="sidebar-minimap"
      aria-label="Minimapa"
    />
  );
}
