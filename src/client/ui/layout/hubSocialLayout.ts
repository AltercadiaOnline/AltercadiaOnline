const CLUSTER_ID = 'ui-hub-social-cluster';

/** Mede o cluster (relógio + HUB) e propaga altura para ancorar o menu dropdown. */
export function syncHubSocialLayoutMetrics(layer: HTMLElement): void {
  const cluster = layer.querySelector<HTMLElement>(`#${CLUSTER_ID}`);
  if (!cluster) return;

  const height = Math.ceil(cluster.getBoundingClientRect().height);
  if (height > 0) {
    layer.style.setProperty('--ui-hub-cluster-height', `${height}px`);
  }
}

/** Observa resize do cluster e da janela — mantém o Hub alinhado abaixo do launcher. */
export function attachHubSocialLayoutSync(layer: HTMLElement): () => void {
  const run = (): void => {
    syncHubSocialLayoutMetrics(layer);
  };

  run();

  const cluster = layer.querySelector<HTMLElement>(`#${CLUSTER_ID}`);
  let observer: ResizeObserver | null = null;
  if (cluster && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(run);
    observer.observe(cluster);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', run);
  }

  return () => {
    observer?.disconnect();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', run);
    }
  };
}
