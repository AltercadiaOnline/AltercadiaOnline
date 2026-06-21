/** Host oculto para controllers legados que ainda exigem nós DOM (paleta moveset/itens). */
export type BattleHudStubElements = {
  readonly host: HTMLElement;
  readonly skillPaletteRow: HTMLElement;
  readonly battleItemsRow: HTMLElement;
};

let cached: BattleHudStubElements | null = null;

export function ensureBattleHudStubHost(root: ParentNode = document): BattleHudStubElements {
  if (cached && cached.host.isConnected) {
    return cached;
  }

  const combat = root.querySelector<HTMLElement>('#scene-combat')
    ?? document.querySelector<HTMLElement>('#scene-combat');
  if (!combat) {
    throw new Error('[battleHudStubHost] #scene-combat ausente.');
  }

  let host = combat.querySelector<HTMLElement>('#battle-hud-stub-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'battle-hud-stub-host';
    host.className = 'hidden';
    host.setAttribute('aria-hidden', 'true');
    combat.appendChild(host);
  }

  let skillPaletteRow = host.querySelector<HTMLElement>('#skill-palette-row');
  if (!skillPaletteRow) {
    skillPaletteRow = document.createElement('div');
    skillPaletteRow.id = 'skill-palette-row';
    skillPaletteRow.className = 'skill-palette battle-skill-slots battle-moveset-drawer hidden';
    skillPaletteRow.setAttribute('data-hud-skill-actions', '');
    skillPaletteRow.setAttribute('aria-label', 'Moveset');
    host.appendChild(skillPaletteRow);
  }

  let battleItemsRow = host.querySelector<HTMLElement>('#battle-items-row');
  if (!battleItemsRow) {
    battleItemsRow = document.createElement('div');
    battleItemsRow.id = 'battle-items-row';
    battleItemsRow.className = 'skill-palette battle-items-drawer hidden';
    battleItemsRow.setAttribute('data-hud-battle-items', '');
    battleItemsRow.setAttribute('aria-label', 'Consumíveis de combate');
    host.appendChild(battleItemsRow);
  }

  cached = { host, skillPaletteRow, battleItemsRow };
  return cached;
}

export function resetBattleHudStubHostCache(): void {
  cached = null;
}
