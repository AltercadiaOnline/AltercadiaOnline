import type { CombatUiHints } from '../../shared/combatWire.js';
import type { CombatState } from '../../shared/types.js';
import { createCombatSocketHandler } from '../hud/combatSocketHandler.js';
import { configureCombatClient, GameClient, initBattleHud } from '../hud/index.js';
import { createBrowserCombatSocket } from './createBrowserCombatSocket.js';

function bootstrapHpBars(state: CombatState): void {
  const container = document.getElementById('hp-bars');
  if (!container) return;

  for (const [id, combatant] of Object.entries(state.combatants)) {
    if (container.querySelector(`[data-hp-for="${id}"]`)) continue;

    const row = document.createElement('div');
    row.className = 'hp-row';

    const label = document.createElement('span');
    label.className = 'hp-label';
    label.textContent = combatant.name;

    const track = document.createElement('div');
    track.className = 'hp-track';

    const fill = document.createElement('div');
    fill.className = 'hp-fill';
    fill.setAttribute('data-hp-for', id);

    track.appendChild(fill);
    row.append(label, track);
    container.appendChild(row);
  }
}

function wsUrlFromLocation(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function boot(): void {
  const statusEl = document.getElementById('connection-status');
  const setStatus = (text: string) => {
    if (statusEl) statusEl.textContent = text;
  };

  initBattleHud(document);

  const socket = createBrowserCombatSocket(wsUrlFromLocation());

  configureCombatClient({
    emitAction: (action) => socket.send('combat-action', action),
  });

  const bridge = {
    consumeCombatEvents: GameClient.consumeCombatEvents.bind(GameClient),
    renderState: (state: CombatState, ui: CombatUiHints) => {
      bootstrapHpBars(state);
      GameClient.renderState(state, ui);
    },
  };

  socket.on('combat-event', createCombatSocketHandler(bridge));

  socket.onOpen(() => {
    setStatus('Conectado — iniciando batalha…');
    socket.send('combat-join', {});
  });

  socket.onError((message) => setStatus(message));
  socket.onClose((message) => setStatus(message));

  setStatus('Conectando…');
  console.log('[MVP] Cliente V2 pronto', wsUrlFromLocation());
}

window.addEventListener('error', (event) => {
  const statusEl = document.getElementById('connection-status');
  if (statusEl && event.message.includes('import')) {
    statusEl.textContent = 'Erro ao carregar módulos JS — faça redeploy após npm run build.';
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
