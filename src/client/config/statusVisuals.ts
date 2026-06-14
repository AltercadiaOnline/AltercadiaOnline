import { RuntimeStatusId } from '../../shared/types/combat.js';

/** Metadados visuais de um status — UI não infere lógica, só espelha o mapa. */
export type StatusVisual = {
  /** Caminho para sprite final; vazio = placeholder textual. */
  readonly iconPath: string;
  /** Identificador estável para CSS / data-attribute. */
  readonly iconId: string;
  /** Placeholder curto (ex: 'B', 'P'). */
  readonly label: string;
  /** Cor de acento (hex ou css). */
  readonly color: string;
};

export const STATUS_VISUALS: Readonly<Record<string, StatusVisual>> = {
  [RuntimeStatusId.Burn]: {
    iconPath: '',
    iconId: 'burn',
    label: 'B',
    color: '#ff6b35',
  },
  [RuntimeStatusId.Paralyze]: {
    iconPath: '',
    iconId: 'paralyze',
    label: 'P',
    color: '#ffd166',
  },
  [RuntimeStatusId.Confuse]: {
    iconPath: '',
    iconId: 'confuse',
    label: 'C',
    color: '#c77dff',
  },
  [RuntimeStatusId.DelayedDetonation]: {
    iconPath: '',
    iconId: 'detonation',
    label: 'D',
    color: '#ef476f',
  },
  [RuntimeStatusId.MovesetWeaken]: {
    iconPath: '',
    iconId: 'weaken',
    label: 'W',
    color: '#8d99ae',
  },
  [RuntimeStatusId.LockEnemyMoves]: {
    iconPath: '',
    iconId: 'lock',
    label: 'L',
    color: '#6c757d',
  },
  [RuntimeStatusId.RetaliationCharge]: {
    iconPath: '',
    iconId: 'fury',
    label: 'F',
    color: '#e63946',
  },
  [RuntimeStatusId.HealEcho]: {
    iconPath: '',
    iconId: 'heal-echo',
    label: 'H',
    color: '#52b788',
  },
  [RuntimeStatusId.AttackEcho]: {
    iconPath: '',
    iconId: 'attack-echo',
    label: 'E',
    color: '#f4a261',
  },
  [RuntimeStatusId.StatusImmunity]: {
    iconPath: '',
    iconId: 'immunity',
    label: 'I',
    color: '#4cc9f0',
  },
  [RuntimeStatusId.Thorns]: {
    iconPath: '',
    iconId: 'thorns',
    label: 'T',
    color: '#2a9d8f',
  },
  [RuntimeStatusId.MarcoCcImmune]: {
    iconPath: '',
    iconId: 'bastion',
    label: 'S',
    color: '#90e0ef',
  },
  [RuntimeStatusId.Vulnerable]: {
    iconPath: '',
    iconId: 'vulnerable',
    label: 'V',
    color: '#fb8500',
  },
};

export function resolveStatusVisual(statusId: string): StatusVisual {
  return STATUS_VISUALS[statusId] ?? {
    iconPath: '',
    iconId: statusId.toLowerCase(),
    label: statusId.charAt(0) ?? '?',
    color: '#adb5bd',
  };
}
