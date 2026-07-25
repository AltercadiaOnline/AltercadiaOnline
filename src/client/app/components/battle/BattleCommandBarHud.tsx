const BATTLE_COMMANDS = ['items', 'skip', 'surrender'] as const;
const OPTIONAL_COMMANDS = ['moveset'] as const;

type BattleCommandId =
  | typeof BATTLE_COMMANDS[number]
  | typeof OPTIONAL_COMMANDS[number];

type BattleCommandBarHudProps = {
  locked: boolean;
  /** Moveset já fica na faixa — botão opcional para foco/legado. */
  showMovesetButton?: boolean;
};

type GlobalBattleCommands = typeof globalThis & {
  __ALTERCADIA_BATTLE_COMMANDS?: Partial<Record<BattleCommandId, () => void>>;
};

const CMD_LABELS: Record<BattleCommandId, string> = {
  moveset: 'Moveset',
  items: 'Itens',
  skip: 'Pular',
  surrender: 'Render-se',
};

function dispatchBattleCommand(cmd: BattleCommandId): void {
  const globalCommands = globalThis as GlobalBattleCommands;
  globalCommands.__ALTERCADIA_BATTLE_COMMANDS?.[cmd]?.();
  document.dispatchEvent(new CustomEvent('altercadia:battle-cmd', {
    detail: { cmd },
  }));
}

export function BattleCommandBarHud({
  locked,
  showMovesetButton = false,
}: BattleCommandBarHudProps) {
  const commands: readonly BattleCommandId[] = showMovesetButton
    ? [...OPTIONAL_COMMANDS, ...BATTLE_COMMANDS]
    : BATTLE_COMMANDS;

  return (
    <nav
      className={[
        'battle-command-bar',
        locked ? 'is-battle-command-locked' : '',
      ].filter(Boolean).join(' ')}
      aria-label="Comandos de combate"
      aria-disabled={locked}
    >
      {commands.map((cmd) => (
        <button
          key={cmd}
          type="button"
          id={`react-battle-cmd-${cmd}`}
          className={[
            'battle-cmd-btn',
            cmd === 'surrender' ? 'battle-cmd-btn--danger' : '',
          ].filter(Boolean).join(' ')}
          data-battle-cmd={cmd}
          disabled={locked}
          title={cmd === 'surrender' ? 'Fugir da batalha — penalidade −20 VOLTS' : undefined}
          onClick={() => dispatchBattleCommand(cmd)}
        >
          {CMD_LABELS[cmd]}
        </button>
      ))}
    </nav>
  );
}
