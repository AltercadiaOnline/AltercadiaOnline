import { describe, expect, it } from 'vitest';
import { getMonsterByCreatureId } from './MonsterCatalog.js';
import { isMonsterDebuffSkillId } from './monsterDebuffCatalog.js';
import { getMonsterSkillById, isMonsterSkillId, monsterSkillToSkillData } from './monsterSkillCatalog.js';

const VORTEX_SKILL_IDS = [
  'vortex_baton',
  'vortex_freq_shock',
  'vortex_signature_drain',
  'vortex_extraction_pulse',
] as const;

const VORTEX_SKILL_NAMES = [
  'Bastão de Contenção',
  'Choque de Frequência',
  'Dreno de Assinatura',
  'Pulso de Extração',
] as const;

const CREATURE_MOVE_NAMES = [
  'Mordida',
  'Mordida Séptica',
  'Peçonha',
  'Investida',
  'Guincho',
  'Gadanha',
  'Bicada Debilitante',
  'Estalo',
  'Mordida Sangrenta',
];

describe('kit próprio do Agente Vórtex', () => {
  it('usa 4 skills próprias, sem fallback de criatura', () => {
    const entry = getMonsterByCreatureId('vortex_agent');
    expect(entry).not.toBeNull();
    expect(entry?.skillIds).toEqual([...VORTEX_SKILL_IDS]);
  });

  it('nomes de batalha são próprios e não reusam kit de criatura', () => {
    const names = VORTEX_SKILL_IDS.map((id) => {
      expect(isMonsterSkillId(id)).toBe(true);
      const skill = getMonsterSkillById(id);
      expect(skill).toBeDefined();
      return skill!.name;
    });

    expect(names).toEqual([...VORTEX_SKILL_NAMES]);
    for (const name of names) {
      expect(CREATURE_MOVE_NAMES).not.toContain(name);
    }
  });

  it('converte para SkillData com o nome de HUD', () => {
    expect(monsterSkillToSkillData('vortex_baton').name).toBe('Bastão de Contenção');
    expect(isMonsterDebuffSkillId('vortex_freq_shock')).toBe(true);
    expect(isMonsterDebuffSkillId('vortex_signature_drain')).toBe(true);
    expect(isMonsterDebuffSkillId('vortex_extraction_pulse')).toBe(true);
    expect(isMonsterDebuffSkillId('vortex_baton')).toBe(false);
  });
});
