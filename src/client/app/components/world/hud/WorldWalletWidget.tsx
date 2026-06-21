import { useEffect, useRef } from 'react';
import { SidebarWallet } from '../../../../ui/components/SidebarWallet.js';

export function WorldWalletWidget() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const wallet = SidebarWallet.mount(host);
    wallet.attach();
    return () => {
      wallet.detach();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="sidebar-wallet"
      aria-label="Carteira"
    />
  );
}
