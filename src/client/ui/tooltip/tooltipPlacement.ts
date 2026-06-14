export type TooltipPlacement = 'above' | 'below' | 'auto';

export type TooltipPositionInput = {
  readonly clientX: number;
  readonly clientY: number;
  readonly tooltipW: number;
  readonly tooltipH: number;
  readonly placement?: TooltipPlacement;
  readonly cursorOffset?: number;
  readonly viewportPadding?: number;
  readonly viewportW: number;
  readonly viewportH: number;
};

export type TooltipPosition = {
  readonly left: number;
  readonly top: number;
};

/** Calcula posição do tooltip — `above`/`below` ancoram pelo centro horizontal do alvo. */
export function resolveTooltipPosition(input: TooltipPositionInput): TooltipPosition {
  const offset = input.cursorOffset ?? 14;
  const pad = input.viewportPadding ?? 8;
  const placement = input.placement ?? 'auto';

  let left: number;
  let top: number;

  if (placement === 'above') {
    left = input.clientX - input.tooltipW / 2;
    top = input.clientY - input.tooltipH - offset;
  } else if (placement === 'below') {
    left = input.clientX - input.tooltipW / 2;
    top = input.clientY + offset;
  } else {
    left = input.clientX + offset;
    top = input.clientY + offset;

    if (left + input.tooltipW > input.viewportW - pad) {
      left = input.clientX - input.tooltipW - offset;
    }
    if (top + input.tooltipH > input.viewportH - pad) {
      top = input.clientY - input.tooltipH - offset;
    }
  }

  left = Math.max(pad, Math.min(left, input.viewportW - input.tooltipW - pad));
  top = Math.max(pad, Math.min(top, input.viewportH - input.tooltipH - pad));

  return { left, top };
}
