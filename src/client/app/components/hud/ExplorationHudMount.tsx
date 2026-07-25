// @ts-nocheck
import { useEffect, useState } from 'react';
import { getAppScreenBridge } from '../../bridge/appScreenBridge.js';
import { getHudBridge } from '../../bridge/hudBridge.js';
import { LogServicePanel } from './LogServicePanel.js';
import { EquipmentSidebarHud } from './EquipmentSidebarHud.js';
import { GlobalChatPanel } from './GlobalChatPanel.js';
import { SidebarMinimapHud } from './SidebarMinimapHud.js';
import { SidebarWalletHud } from './SidebarWalletHud.js';
function readScreenSnapshot() {
    return getAppScreenBridge().snapshot();
}
function readHudSnapshot() {
    return getHudBridge().snapshot();
}
function LogServiceToast({ toast, }) {
    if (!toast.visible)
        return null;
    return (<div className={[
            'pointer-events-none absolute left-1/2 top-[12%] z-[12] max-w-[min(420px,90%)] -translate-x-1/2 px-3 py-2 text-center text-[0.85rem]',
            'border bg-[rgba(18,14,8,0.94)] transition-opacity duration-300',
            toast.variant === 'error'
                ? 'z-[1000005] border-[rgba(255,110,110,0.75)] text-[#ffc8c8]'
                : 'border-[rgba(212,175,55,0.65)] text-[#f5e6c8]',
        ].join(' ')} role="status" aria-live="assertive">
      {toast.message}
    </div>);
}
export function ExplorationHudMount() {
    const [screen, setScreen] = useState(() => readScreenSnapshot());
    const [hud, setHud] = useState(() => readHudSnapshot());
    useEffect(() => getAppScreenBridge().subscribe(setScreen), []);
    useEffect(() => getHudBridge().subscribe(setHud), []);
    useEffect(() => {
        if (hud.logCollapsed || !hud.gameHudActive)
            return;
        getHudBridge().clearUnreadCount();
    }, [hud.logCollapsed, hud.gameHudActive, hud.logLines.length]);
    if (screen.activeScreen !== 'game-container'
        || !hud.controllerReady
        || !hud.gameHudActive) {
        return null;
    }
    return (<div className="pointer-events-none absolute inset-0 z-[920] overflow-hidden">
      <div className="pointer-events-none absolute bottom-2 left-2 z-[3] flex flex-col gap-1" style={{ width: 'min(429px, calc(100% - var(--game-hud-sidebar-width) - 16px))' }}>
        <LogServicePanel lines={hud.logLines} collapsed={hud.logCollapsed} unreadCount={hud.logUnreadCount} onToggle={() => {
            const bridge = getHudBridge();
            bridge.toggleLogCollapsed();
            if (!bridge.snapshot().logCollapsed) {
                bridge.clearUnreadCount();
            }
        }}/>
        <GlobalChatPanel lines={hud.chatLines}/>
      </div>

      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-[3] flex flex-col" style={{
            width: 'var(--game-hud-sidebar-width)',
            gap: 'var(--sidebar-stack-gap)',
        }}>
        <SidebarMinimapHud />
        <SidebarWalletHud />
        <EquipmentSidebarHud />
      </div>

      {hud.toast ? <LogServiceToast toast={hud.toast}/> : null}
    </div>);
}
