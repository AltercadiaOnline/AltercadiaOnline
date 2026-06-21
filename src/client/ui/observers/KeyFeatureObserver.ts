import type { HubPanelController } from '../components/HubPanelController.js';

export type KeyFeatureMount = {
  readonly id: string;
  mount(anchor: HTMLElement): void;
  unmount(): void;
};

/**
 * Reservado para features dinâmicas plugáveis no Hub (sem slot fixo na barra).
 */
export class KeyFeatureObserver {
  private anchor: HTMLElement | null = null;
  private active: KeyFeatureMount | null = null;

  attachHub(_hub: HubPanelController): void {
    this.detach();
    this.anchor = null;
  }

  mountFeature(feature: KeyFeatureMount): void {
    this.unmountFeature();
    this.active = feature;
    if (this.anchor) {
      feature.mount(this.anchor);
    }
  }

  unmountFeature(): void {
    this.active?.unmount();
    this.active = null;
  }

  detach(): void {
    this.unmountFeature();
    this.anchor = null;
  }
}
