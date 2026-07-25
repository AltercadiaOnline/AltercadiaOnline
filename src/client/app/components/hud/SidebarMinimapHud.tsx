// @ts-nocheck
import { useRef } from 'react';
import { useSidebarMinimap } from '../../hud/useSidebarMinimap.js';
export function SidebarMinimapHud() {
    const canvasRef = useRef(null);
    useSidebarMinimap(canvasRef);
    return (<div className="pointer-events-auto flex items-center justify-center border border-[#5e4a30] bg-[rgba(10,8,6,0.75)] p-1.5" style={{
            height: 'var(--sidebar-minimap-height)',
            width: 'var(--game-hud-sidebar-width)',
        }}>
      <canvas ref={canvasRef} className="sidebar-minimap__canvas h-full w-full" aria-label="Minimapa do mundo — clique para mover" role="img"/>
    </div>);
}
