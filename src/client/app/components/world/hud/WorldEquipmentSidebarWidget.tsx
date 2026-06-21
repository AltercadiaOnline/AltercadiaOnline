import { useEffect, useRef } from 'react';
import {
  destroyEquipmentSidebar,
  EquipmentSidebar,
} from '../../../../ui/components/EquipmentSidebar.js';

export function WorldEquipmentSidebarWidget() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const sidebar = EquipmentSidebar.mount(host);
    sidebar.attach();
    return () => {
      destroyEquipmentSidebar();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="equipment-sidebar__mount"
      aria-label="Equipamentos e status"
    />
  );
}
