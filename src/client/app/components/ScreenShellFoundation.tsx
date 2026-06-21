import { useEffect, useState } from 'react';
import { getAppScreenBridge, type AppScreenSnapshot } from '../bridge/appScreenBridge.js';

function readScreenSnapshot(): AppScreenSnapshot {
  return getAppScreenBridge().snapshot();
}

export function ScreenShellFoundation() {
  const [screen, setScreen] = useState<AppScreenSnapshot>(() => readScreenSnapshot());

  useEffect(() => getAppScreenBridge().subscribe(setScreen), []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[950] flex justify-center">
      <div className="rounded-md border border-white/10 bg-[rgba(5,10,13,0.88)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm">
        <span className="text-[#6ee7b7]">screen</span>
        {' '}
        {screen.activeScreen}
        {' · '}
        <span className="text-[#58a6ff]">auth</span>
        {' '}
        {screen.authView}
      </div>
    </div>
  );
}
