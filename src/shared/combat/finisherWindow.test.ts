import { describe, expect, it } from 'vitest';
import { MoveEffectKind } from './classMovesetCatalog.js';
import {
  DEFAULT_FINISHER_SELF_DAMAGE_IN_WINDOW_PERCENT,
  DEFAULT_FINISHER_SELF_DAMAGE_PERCENT,
  DEFAULT_FINISHER_WINDOW_BONUS_PERCENT,
  isFinisherSkill,
  resolveFinisherBurstPower,
  resolveFinisherSelfDamagePercent,
  resolveFinisherWindowTurns,
  shouldEchoOnlyOnFinisher,
} from './finisherWindow.js';
import { CLASS_DEFAULT_ACTIVE_LOADOUT } from './moveGameplayRole.js';
import { getDefaultClassActiveLoadout } from './movesetLoadout.js';

describe('finisherWindow (Impetus piloto)', () => {
  it('defaults da ficha bateem com CLASS_DEFAULT_ACTIVE_LOADOUT', () => {
    expect(getDefaultClassActiveLoadout('IMPETUS')).toEqual(['IMP_4', 'IMP_2', 'IMP_3', 'IMP_6']);
    expect(CLASS_DEFAULT_ACTIVE_LOADOUT.COGITOR).toEqual(['COG_4', 'COG_3', 'COG_1', 'COG_5']);
    expect(CLASS_DEFAULT_ACTIVE_LOADOUT.TUTATOR).toEqual(['TUT_5', 'TUT_2', 'TUT_1', 'TUT_3']);
    expect(CLASS_DEFAULT_ACTIVE_LOADOUT.DISSOLUTUS).toEqual(['DIS_2', 'DIS_4', 'DIS_3', 'DIS_1']);
  });

  it('reconhece finisher e eco só no finisher', () => {
    expect(isFinisherSkill({ id: 'IMP_6', effectKind: MoveEffectKind.HighRiskBurst })).toBe(true);
    expect(isFinisherSkill({ id: 'IMP_1', effectKind: MoveEffectKind.PureDamage })).toBe(false);
    expect(shouldEchoOnlyOnFinisher({ echoFinisherOnly: 1 })).toBe(true);
    expect(shouldEchoOnlyOnFinisher({})).toBe(false);
  });

  it('escala Fúria na janela e reduz autodano', () => {
    expect(resolveFinisherWindowTurns({ finisherWindowTurns: 2 })).toBe(2);
    expect(resolveFinisherWindowTurns({})).toBe(0);

    const base = 100;
    expect(resolveFinisherBurstPower(base, {}, false)).toBe(100);
    expect(resolveFinisherBurstPower(base, {}, true)).toBe(
      Math.floor(base * (1 + DEFAULT_FINISHER_WINDOW_BONUS_PERCENT / 100)),
    );

    expect(resolveFinisherSelfDamagePercent({}, false)).toBe(DEFAULT_FINISHER_SELF_DAMAGE_PERCENT);
    expect(resolveFinisherSelfDamagePercent({}, true)).toBe(
      DEFAULT_FINISHER_SELF_DAMAGE_IN_WINDOW_PERCENT,
    );
  });
});
