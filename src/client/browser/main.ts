import type { CombatUiHints } from '../../shared/combatWire.js';
import type { CombatState } from '../../shared/types.js';
import { createCombatSocketHandler } from '../hud/combatSocketHandler.js';
import { configureCombatClient, GameClient, initBattleHud } from '../hud/index.js';
import { generateMapData, MapManager } from '../MapManager.js';
import { createMockWorldSocket } from '../services/mockWorldSocket.js';
import type { WorldSocket } from '../world/WorldSocket.js';
import { showScreen } from '../navigation.js';
import { ExplorationScene } from '../scenes/Exploration.js';
import { setupLoginScreen } from '../services/loginScreen.js';
import { AppScreens } from './appScreens.js';
import { createBrowserCombatSocket, type BrowserCombatSocket } from './createBrowserCombatSocket.js';
import { SceneManager } from './sceneManager.js';

let mapManager: MapManager;
let worldSocket: WorldSocket;
let world: ExplorationScene;
let socket: BrowserCombatSocket | null = null;
let worldStarted = false;
let gameLoopStarted = false;

function gameLoop(): void {
  if (worldStarted && !document.getElementById('scene-exploration')?.classList.contains('hidden')) {
    world.update();
    world.prepareFrame();
    mapManager.render(world.ctx, world.camera.x, world.camera.y);
    world.drawPlayer();
  }
  requestAnimationFrame(gameLoop);
}

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
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:' ;
  return `${protocol}//${window.location.host}/ws`;
}

function setStatus(text: string): void {
  const statusEl = document.getElementById('connection-status');
  const explorationStatusEl = document.getElementById('exploration-status');
  if (statusEl) statusEl.textContent = text;
  if (explorationStatusEl) explorationStatusEl.textContent = text;
}

function connectSocket(): void {
  if (socket) return;

  socket = createBrowserCombatSocket(wsUrlFromLocation());

  configureCombatClient({
    emitAction: (action) => socket?.send('combat-action', action),
  });

  const bridge = {
    consumeCombatEvents: GameClient.consumeCombatEvents.bind(GameClient),
    renderState: (state: CombatState, ui: CombatUiHints) => {
      bootstrapHpBars(state);
      GameClient.renderState(state, ui);
    },
  };

  socket.on('combat-event', createCombatSocketHandler(bridge));

  socket.on('START_COMBAT', () => {
    SceneManager.showCombat();
    setStatus('Combate iniciado…');
  });

  socket.onOpen(() => {
    setStatus('Conectado — explorando Altercadia…');
  });

  socket.onError((message) => setStatus(message));
  socket.onClose((message) => {
    setStatus(message);
    SceneManager.showExploration();
  });

  setStatus('Conectando…');
}

function enterWorld(): void {
  if (worldStarted) return;
  worldStarted = true;

  AppScreens.showGameWorld();

  const mapData = generateMapData();
  mapManager = new MapManager(mapData);
  worldSocket = createMockWorldSocket(mapData);
  world = new ExplorationScene(mapManager, worldSocket);
  window.addEventListener('resize', () => world.resize());

  if (!gameLoopStarted) {
    gameLoopStarted = true;
    gameLoop();
  }

  connectSocket();

  const selected = AppScreens.getSelectedCharacter();
  console.log('[Altercadia] Entrou no mundo', {
    userId: AppScreens.accountProfile?.userId,
    character: selected,
  });

  if (selected) {
    setStatus(`Conectando como ${selected.name}…`);
  }
}

function onLoginSuccess(): void {
  showScreen('char-select-screen');
  AppScreens.loadAccountProfile();
  AppScreens.renderCharacterSlots();
  AppScreens.syncCharacterSelectionUi();
}

function setupLogin(): void {
  setupLoginScreen({
    authService: AppScreens.authService,
    onAuthenticated: onLoginSuccess,
  });
}

function boot(): void {
  try {
    initBattleHud(document);
    setupLogin();
    void AppScreens.init(enterWorld);
    console.log('[MVP] Cliente V2 pronto');
  } catch (error) {
    console.error('[MVP] Falha ao iniciar cliente:', error);
    const statusEl = document.getElementById('auth-status');
    if (statusEl) {
      statusEl.textContent = 'Erro ao iniciar o cliente. Recarregue a página (F5).';
      statusEl.classList.add('is-error');
    }
  }
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
