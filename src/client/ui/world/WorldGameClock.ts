import {
  formatGameTimeDigital,
  resolveGameDayPhase,
} from '../../../shared/world/gameTime.js';
import { getGameTimeStore } from '../../world/gameTimeStore.js';

const CLOCK_ID = 'world-game-clock';
const CLUSTER_ID = 'ui-hub-social-cluster';
const LAUNCHER_ID = 'ui-hub-launcher';

export type WorldGameClockHandle = {
  readonly destroy: () => void;
};

const PHASE_LABEL: Record<ReturnType<typeof resolveGameDayPhase>, string> = {
  night: 'NOITE',
  dawn: 'AMANHECER',
  day: 'DIA',
  dusk: 'ENTARDECER',
};

function applyClockDisplay(root: HTMLElement, gameTimeSeconds: number): void {
  const timeEl = root.querySelector<HTMLElement>('[data-world-clock-time]');
  const phaseEl = root.querySelector<HTMLElement>('[data-world-clock-phase]');
  if (!timeEl) return;

  timeEl.textContent = formatGameTimeDigital(gameTimeSeconds);
  const phase = resolveGameDayPhase(gameTimeSeconds);
  root.dataset.phase = phase;
  if (phaseEl) {
    phaseEl.textContent = PHASE_LABEL[phase];
  }
}

export function ensureHubSocialCluster(layer: HTMLElement): HTMLElement {
  let cluster = layer.querySelector<HTMLElement>(`#${CLUSTER_ID}`);
  if (cluster) return cluster;

  cluster = document.createElement('div');
  cluster.id = CLUSTER_ID;
  cluster.className = 'ui-hub-social-cluster';
  cluster.setAttribute('aria-label', 'Hub Social e relógio do mundo');

  const launcher = layer.querySelector<HTMLButtonElement>(`#${LAUNCHER_ID}`);
  if (launcher?.parentElement === layer) {
    layer.insertBefore(cluster, launcher);
    cluster.appendChild(launcher);
  } else {
    layer.appendChild(cluster);
  }

  return cluster;
}

export function mountWorldGameClock(layer: HTMLElement): WorldGameClockHandle {
  const cluster = ensureHubSocialCluster(layer);

  let clock = cluster.querySelector<HTMLElement>(`#${CLOCK_ID}`);
  if (!clock) {
    clock = document.createElement('div');
    clock.id = CLOCK_ID;
    clock.className = 'world-game-clock';
    clock.setAttribute('aria-live', 'polite');
    clock.setAttribute('aria-label', 'Hora do mundo');
    clock.innerHTML = `
      <span class="world-game-clock__label">HORA MUNDO</span>
      <span class="world-game-clock__time" data-world-clock-time>00:00:00</span>
      <span class="world-game-clock__phase" data-world-clock-phase>—</span>
    `;
    cluster.insertBefore(clock, cluster.firstChild);
  }

  const element = clock;
  const store = getGameTimeStore();

  applyClockDisplay(element, store.getInterpolatedGameTime());

  const unsubscribe = store.subscribe((seconds) => {
    applyClockDisplay(element, seconds);
  });

  let rafId = 0;
  const tick = (): void => {
    applyClockDisplay(element, store.getInterpolatedGameTime());
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return {
    destroy: () => {
      cancelAnimationFrame(rafId);
      unsubscribe();
      element.remove();
    },
  };
}
