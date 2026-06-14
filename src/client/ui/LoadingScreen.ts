/** Overlay de loading/fade durante TRANSITIONING — bloqueia input visualmente. */
export class LoadingScreen {
  private readonly root: HTMLElement | null;
  private visible = false;

  constructor(root: HTMLElement | null | undefined) {
    this.root = root ?? null;
  }

  show(): void {
    if (!this.root || this.visible) return;
    this.visible = true;
    this.root.classList.remove('hidden');
    this.root.setAttribute('aria-hidden', 'false');
    this.root.classList.add('is-active');
  }

  hide(): void {
    if (!this.root || !this.visible) return;
    this.visible = false;
    this.root.classList.remove('is-active');
    this.root.classList.add('hidden');
    this.root.setAttribute('aria-hidden', 'true');
  }

  destroy(): void {
    this.hide();
  }
}
