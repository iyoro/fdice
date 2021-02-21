import { parse, DieTooBigError, TooManyDiceError, TooManyChunksError } from '../src/fdice.js';
import random from '../src/random.js';

describe('Expression', () => {
    it('allows die with bonus', () => {
        const s = spyOn(random, 'die').withArgs(4).and.returnValues(1, 2);
        const f = parse('2d4 + 2');
        expect(f).not.toBeNull();
        expect(f()).toBe(5);
    });

    it('allows die with malus', () => {
        const s = spyOn(random, 'die').withArgs(4).and.returnValue(1);
        const f = parse('2d4 - 3');
        expect(f).not.toBeNull();
        expect(f()).toBe(-1);
        expect(s.calls.count()).toBe(2);
    });

    it('ignores whitespace', () => {
        const s = spyOn(random, 'die').withArgs(4).and.returnValue(1);
        const f = parse('  2   d 4    +     2  - 3');
        expect(f).not.toBeNull();
        expect(f()).toBe(1);
        expect(s.calls.count()).toBe(2);
    });

    it('allows multiple dice', () => {
        const s = spyOn(random, 'die')
            .withArgs(6).and.returnValue(6)
            .withArgs(2).and.returnValue(2);
        const f = parse('3d6-2d2');
        expect(f).not.toBeNull();
        expect(f()).toBe(14);
        expect(s.calls.count()).toBe(5);
    });

    it('allows a mix of dice and constants', () => {
        const s = spyOn(random, 'die')
            .withArgs(6).and.returnValue(6)
            .withArgs(4).and.returnValue(4)
            .withArgs(2).and.returnValue(2);
        const f = parse('3d6+4-2-1d2-2+1+d4');
        expect(f).not.toBeNull();
        expect(f()).toBe(21);
        expect(s.calls.count()).toBe(5); // total dice rolled
    });

    // See also testing for modifiers, which may push a valid expression over a limit.
    describe('limit', () => {
        it('prevents using too many chunks', () => {
            // 'actual' for toThrow must be a func.
            expect(() => parse('1+1+1+1+1+1+1+1+1+1')).not.toThrowError(TooManyChunksError);
            expect(() => parse('1+1+1+1+1+1+1+1+1+1+1')).toThrowError(TooManyChunksError);
        });
        it('prevents using too big of a die', () => {
            expect(() => parse('1d1001')).toThrowError(DieTooBigError);
        });

        it('prevents using too many dice', () => {
            expect(() => parse('101d6')).toThrowError(TooManyDiceError);
        });
    });
});
