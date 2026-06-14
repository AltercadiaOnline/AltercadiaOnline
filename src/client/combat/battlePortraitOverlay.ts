import type { Combatant } from '../../shared/types.js';

export type PortraitOverlayChip = {
  readonly kind: 'shield' | 'defense' | 'thorns' | 'status';
  readonly label: string;
  readonly value: number;
  readonly turnsRemaining?: number;
};

function pushPortraitChip(
  chips: PortraitOverlayChip[],
  chip: PortraitOverlayChip,
): void {
  if (chip.turnsRemaining === undefined) {
    chips.push({
      kind: chip.kind,
      label: chip.label,
      value: chip.value,
    });
    return;
  }
  chips.push(chip);
}

/** Deriva chips visíveis no portrait a partir do snapshot autoritativo. */
export function resolvePortraitOverlayChips(combatant: Combatant): readonly PortraitOverlayChip[] {
  const chips: PortraitOverlayChip[] = [];

  const shieldTotal = (combatant.activeShields ?? []).reduce((sum, entry) => sum + Math.max(0, entry.value), 0);
  if (shieldTotal > 0) {
    const maxTurns = Math.max(...(combatant.activeShields ?? []).map((s) => s.turnsRemaining), 0);
    const chip: PortraitOverlayChip = {
      kind: 'shield',
      label: 'ESC',
      value: shieldTotal,
    };
    if (maxTurns > 0) {
      pushPortraitChip(chips, { ...chip, turnsRemaining: maxTurns });
    } else {
      pushPortraitChip(chips, chip);
    }
  }

  for (const mod of combatant.temporaryModifiers ?? []) {
    if (mod.kind === 'INCOMING_DAMAGE_REDUCTION' && mod.percent > 0) {
      pushPortraitChip(chips, {
        kind: 'defense',
        label: 'DEF',
        value: mod.percent,
        turnsRemaining: mod.turnsRemaining,
      });
    }
    if (mod.kind === 'DEFENSE' && mod.percent > 0) {
      pushPortraitChip(chips, {
        kind: 'defense',
        label: 'DEF',
        value: mod.percent,
        turnsRemaining: mod.turnsRemaining,
      });
    }
  }

  for (const status of combatant.activeStatuses ?? []) {
    if (status.id === 'THORNS') {
      pushPortraitChip(chips, {
        kind: 'thorns',
        label: 'ESP',
        value: status.metadata?.reflectPercent ?? 20,
        turnsRemaining: status.turnsRemaining,
      });
    } else if (status.id === 'STATUS_IMMUNITY') {
      pushPortraitChip(chips, {
        kind: 'status',
        label: 'IMM',
        value: 100,
        turnsRemaining: status.turnsRemaining,
      });
    } else if (status.id === 'BURN') {
      pushPortraitChip(chips, {
        kind: 'status',
        label: 'BRN',
        value: status.stacks,
        turnsRemaining: status.turnsRemaining,
      });
    } else if (status.id === 'PARALYZE') {
      pushPortraitChip(chips, {
        kind: 'status',
        label: 'PAR',
        value: status.metadata?.skipTurnChance ?? 60,
        turnsRemaining: status.turnsRemaining,
      });
    } else if (status.id === 'CONFUSE') {
      pushPortraitChip(chips, {
        kind: 'status',
        label: 'CNF',
        value: status.metadata?.failChance ?? 35,
        turnsRemaining: status.turnsRemaining,
      });
    } else if (status.id === 'VULNERABLE') {
      pushPortraitChip(chips, {
        kind: 'status',
        label: 'VUL',
        value: 20,
        turnsRemaining: status.turnsRemaining,
      });
    }
  }

  return chips;
}

export function syncPortraitOverlayChips(portrait: HTMLElement, chips: readonly PortraitOverlayChip[]): void {
  let layer = portrait.querySelector<HTMLElement>('.battle-portrait-overlay');
  if (chips.length === 0) {
    layer?.remove();
    portrait.classList.remove('battle-portrait--has-shield', 'battle-portrait--has-defense', 'battle-portrait--has-thorns');
    return;
  }

  if (!layer) {
    layer = portrait.ownerDocument.createElement('div');
    layer.className = 'battle-portrait-overlay';
    layer.setAttribute('aria-hidden', 'true');
    portrait.appendChild(layer);
  }

  layer.replaceChildren();
  for (const chip of chips) {
    const el = portrait.ownerDocument.createElement('span');
    el.className = `battle-portrait-chip battle-portrait-chip--${chip.kind}`;
    const turns = chip.turnsRemaining !== undefined ? ` · ${chip.turnsRemaining}t` : '';
    el.textContent = `${chip.label} ${Math.round(chip.value)}${turns}`;
    layer.appendChild(el);
  }

  portrait.classList.toggle('battle-portrait--has-shield', chips.some((c) => c.kind === 'shield'));
  portrait.classList.toggle('battle-portrait--has-defense', chips.some((c) => c.kind === 'defense'));
  portrait.classList.toggle('battle-portrait--has-thorns', chips.some((c) => c.kind === 'thorns'));
}
