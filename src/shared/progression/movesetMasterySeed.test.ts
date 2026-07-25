// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { ensureMovesetMasteryForClass, reconcileClassAndMovesetMastery, resolveAuthoritativeClassId, } from './movesetMasterySeed.js';
describe('resolveAuthoritativeClassId', () => {
    it('prefere a classe persistida sobre a inferência', () => {
        const mastery = ensureMovesetMasteryForClass({}, 'IMPETUS');
        expect(resolveAuthoritativeClassId('TUTATOR', mastery)).toBe('TUTATOR');
    });
    it('infere pela mastery quando o perfil não tem classId', () => {
        const mastery = ensureMovesetMasteryForClass({}, 'COGITOR');
        expect(resolveAuthoritativeClassId(undefined, mastery)).toBe('COGITOR');
    });
    it('cai em IMPETUS só quando mastery e classId estão vazios', () => {
        expect(resolveAuthoritativeClassId(undefined, {})).toBe('IMPETUS');
    });
});
describe('reconcileClassAndMovesetMastery', () => {
    it('seed o pool da classe quando o domínio está vazio', () => {
        const result = reconcileClassAndMovesetMastery('DISSOLUTUS', {});
        expect(result.classId).toBe('DISSOLUTUS');
        expect(result.classIdWasMissing).toBe(false);
        expect(result.masteryWasPatched).toBe(true);
        expect(Object.keys(result.movesetMastery).every((id) => id.startsWith('DIS_'))).toBe(true);
    });
    it('marca classIdWasMissing e grava a classe inferida do domínio', () => {
        const mastery = ensureMovesetMasteryForClass({}, 'TUTATOR');
        const result = reconcileClassAndMovesetMastery(undefined, mastery);
        expect(result.classId).toBe('TUTATOR');
        expect(result.classIdWasMissing).toBe(true);
    });
});
