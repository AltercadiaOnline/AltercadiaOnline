export type HudDynamicLayoutOptions = {
  /** Região medida — padrão `[data-hud-fit-root]` ou `.ui-panel__body`. */
  readonly fitRootSelector?: string;
  /** Itens enumeráveis que podem ser ocultados por prioridade. */
  readonly itemSelector?: string;
  /** Elementos decorativos ocultados antes do corte de itens. */
  readonly secondarySelector?: string;
  readonly minScale?: number;
  readonly minPaddingFactor?: number;
  readonly minGapFactor?: number;
  readonly minVisibleItems?: number;
};

export type HudDynamicLayoutResult = {
  readonly scale: number;
  readonly paddingFactor: number;
  readonly gapFactor: number;
  readonly hiddenItems: number;
  readonly hiddenSecondaries: number;
  readonly fits: boolean;
};

const DEFAULT_OPTIONS: Required<HudDynamicLayoutOptions> = {
  fitRootSelector: '[data-hud-fit-root], .ui-panel__body',
  itemSelector: '[data-hud-fit-item]',
  secondarySelector: '[data-hud-fit-secondary]',
  minScale: 0.58,
  minPaddingFactor: 0.42,
  minGapFactor: 0.35,
  minVisibleItems: 1,
};

const BASE_PAD_REM = 0.8;
const BASE_GAP_REM = 0.65;
const BASE_FONT_REM = 0.82;

export function resetHudDynamicLayout(panel: HTMLElement): void {
  panel.style.removeProperty('--hud-ui-scale');
  panel.style.removeProperty('--hud-ui-pad');
  panel.style.removeProperty('--hud-ui-gap');
  panel.style.removeProperty('--hud-ui-font');
  panel.dataset.hudFitState = 'normal';
  panel.classList.remove('ui-panel--hud-trimmed');

  for (const el of panel.querySelectorAll('[data-hud-fit-hidden]')) {
    if (el instanceof HTMLElement) {
      el.hidden = false;
      el.removeAttribute('data-hud-fit-hidden');
    }
  }
}

export function applyHudDynamicLayout(
  panel: HTMLElement,
  options: HudDynamicLayoutOptions = {},
): HudDynamicLayoutResult {
  const config = { ...DEFAULT_OPTIONS, ...options };
  resetHudDynamicLayout(panel);

  const fitRoot = panel.querySelector<HTMLElement>(config.fitRootSelector);
  if (!fitRoot) {
    return {
      scale: 1,
      paddingFactor: 1,
      gapFactor: 1,
      hiddenItems: 0,
      hiddenSecondaries: 0,
      fits: true,
    };
  }

  const header = panel.querySelector<HTMLElement>('.ui-panel__header, .cael-panel__header');
  const available = measureAvailableSpace(panel, fitRoot, header);

  const items = collectFitItems(fitRoot, config.itemSelector);
  const secondaries = [...fitRoot.querySelectorAll<HTMLElement>(config.secondarySelector)];

  let paddingFactor = 1;
  let gapFactor = 1;
  let scale = 1;
  let hiddenSecondaries = 0;
  let hiddenItems = 0;

  const applyVars = (): void => {
    panel.style.setProperty('--hud-ui-scale', scale.toFixed(3));
    panel.style.setProperty('--hud-ui-pad', `${(BASE_PAD_REM * paddingFactor).toFixed(3)}rem`);
    panel.style.setProperty('--hud-ui-gap', `${(BASE_GAP_REM * gapFactor).toFixed(3)}rem`);
    panel.style.setProperty('--hud-ui-font', `${(BASE_FONT_REM * scale).toFixed(3)}rem`);
  };

  applyVars();

  if (!contentFits(fitRoot, available)) {
    paddingFactor = config.minPaddingFactor;
    gapFactor = config.minGapFactor;
    applyVars();
  }

  if (!contentFits(fitRoot, available)) {
    scale = computeScaleToFit(fitRoot, available, config.minScale);
    applyVars();
  }

  if (!contentFits(fitRoot, available)) {
    for (const el of secondaries) {
      el.hidden = true;
      el.dataset.hudFitHidden = '1';
      hiddenSecondaries += 1;
      if (contentFits(fitRoot, available)) break;
    }
  }

  if (!contentFits(fitRoot, available) && items.length > config.minVisibleItems) {
    const trimOrder = [...items].sort(
      (a, b) => readPriority(b) - readPriority(a),
    );

    for (const el of trimOrder) {
      if (items.filter((node) => !node.hidden).length <= config.minVisibleItems) break;
      el.hidden = true;
      el.dataset.hudFitHidden = '1';
      hiddenItems += 1;
      if (contentFits(fitRoot, available)) break;
    }
  }

  const fits = contentFits(fitRoot, available);
  panel.dataset.hudFitState = fits
    ? scale < 1 || hiddenItems > 0 || hiddenSecondaries > 0
      ? 'adjusted'
      : 'normal'
    : 'overflow';
  panel.classList.toggle('ui-panel--hud-trimmed', hiddenItems > 0 || hiddenSecondaries > 0);

  return {
    scale,
    paddingFactor,
    gapFactor,
    hiddenItems,
    hiddenSecondaries,
    fits,
  };
}

export function attachHudDynamicLayout(
  panel: HTMLElement,
  options: HudDynamicLayoutOptions = {},
): () => void {
  let frame = 0;

  const schedule = (): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      applyHudDynamicLayout(panel, options);
    });
  };

  schedule();

  const observer = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(schedule)
    : null;
  observer?.observe(panel);

  const onWindowResize = (): void => schedule();
  window.addEventListener('resize', onWindowResize);

  return () => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
    window.removeEventListener('resize', onWindowResize);
    resetHudDynamicLayout(panel);
  };
}

type AvailableSpace = {
  readonly width: number;
  readonly height: number;
};

function measureAvailableSpace(
  panel: HTMLElement,
  fitRoot: HTMLElement,
  header: HTMLElement | null,
): AvailableSpace {
  const panelStyles = getComputedStyle(panel);
  const bodyStyles = getComputedStyle(fitRoot);

  const headerHeight = header?.offsetHeight ?? 0;
  const verticalChrome =
    headerHeight +
    parseFloat(panelStyles.paddingTop) +
    parseFloat(panelStyles.paddingBottom) +
    parseFloat(bodyStyles.paddingTop) +
    parseFloat(bodyStyles.paddingBottom);

  const horizontalChrome =
    parseFloat(panelStyles.paddingLeft) +
    parseFloat(panelStyles.paddingRight) +
    parseFloat(bodyStyles.paddingLeft) +
    parseFloat(bodyStyles.paddingRight);

  let height = Math.max(0, panel.clientHeight - verticalChrome);
  const width = Math.max(0, panel.clientWidth - horizontalChrome);

  const slotParent = fitRoot.parentElement;
  if (slotParent && panel.contains(slotParent) && slotParent !== panel) {
    const siblingHeight = [...slotParent.children].reduce((sum, child) => {
      if (child === fitRoot || !(child instanceof HTMLElement)) return sum;
      return sum + child.offsetHeight;
    }, 0);
    const parentStyles = getComputedStyle(slotParent);
    const parentVerticalPad =
      parseFloat(parentStyles.paddingTop) + parseFloat(parentStyles.paddingBottom);
    const slotHeight = slotParent.clientHeight - siblingHeight - parentVerticalPad;
    if (slotHeight > 0) {
      height = Math.min(height, slotHeight);
    }
  }

  return { width, height };
}

function contentFits(fitRoot: HTMLElement, available: AvailableSpace): boolean {
  const tolerance = 2;
  return (
    fitRoot.scrollWidth <= available.width + tolerance &&
    fitRoot.scrollHeight <= available.height + tolerance
  );
}

function computeScaleToFit(
  fitRoot: HTMLElement,
  available: AvailableSpace,
  minScale: number,
): number {
  const widthRatio = available.width / Math.max(1, fitRoot.scrollWidth);
  const heightRatio = available.height / Math.max(1, fitRoot.scrollHeight);
  const target = Math.min(1, widthRatio, heightRatio);
  return Math.max(minScale, target);
}

function collectFitItems(root: HTMLElement, selector: string): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(selector)];
}

function readPriority(element: HTMLElement): number {
  const raw = element.dataset.hudPriority;
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 5;
}
