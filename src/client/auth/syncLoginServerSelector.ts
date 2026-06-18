import { SERVER_INSTANCE_CATALOG } from '../../shared/world/serverInstanceCatalog.js';
import { getClientRuntimeConfig } from '../runtime/clientRuntimeConfig.js';
import { requireServerId } from '../../shared/supabase/characterServerScope.js';

/** Preenche o seletor de shard na HUD de login com o valor de /config/client. */
export function syncLoginServerSelector(): void {
  const select = document.getElementById('server-id-input');
  if (!(select instanceof HTMLSelectElement)) return;

  const config = getClientRuntimeConfig();
  const preferredId = config?.serverId?.trim().toLowerCase() ?? 'default';

  select.replaceChildren();

  for (const definition of Object.values(SERVER_INSTANCE_CATALOG)) {
    const option = document.createElement('option');
    option.value = definition.id;
    option.textContent = definition.displayName;
    select.appendChild(option);
  }

  try {
    select.value = requireServerId(preferredId);
  } catch {
    select.value = 'default';
  }

  const label = document.getElementById('server-id-label');
  if (label && config?.serverName) {
    label.textContent = `Servidor (deploy: ${config.serverName})`;
  }
}
