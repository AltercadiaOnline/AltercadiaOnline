export type ClassType = 'IMPETUS' | 'COGITOR' | 'TUTATOR' | 'DISSOLUTUS';

export interface ClassDefinition {
  name: ClassType;
  trait: string; // Instinto, Cálculo, Proteção, Desafio
  bonus: {
    attack: number;
    defense: number;
    agility: number;
    control: number;
  };
}

export const CLASS_CATALOG: Record<ClassType, ClassDefinition> = {
  IMPETUS: {
    name: 'IMPETUS',
    trait: 'Instinto',
    bonus: { attack: 10, defense: 2, agility: 5, control: 1 },
  },
  COGITOR: {
    name: 'COGITOR',
    trait: 'Cálculo',
    bonus: { attack: 3, defense: 3, agility: 3, control: 10 },
  },
  TUTATOR: {
    name: 'TUTATOR',
    trait: 'Proteção',
    bonus: { attack: 2, defense: 10, agility: 2, control: 5 },
  },
  DISSOLUTUS: {
    name: 'DISSOLUTUS',
    trait: 'Desafio',
    bonus: { attack: 6, defense: 4, agility: 8, control: 4 },
  },
};
