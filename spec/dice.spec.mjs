import { parse } from '../src/fdice.js';
import random from '../src/random.js';

describe('Dice', () => {
    describe('chunk', () => {
        [
            'd6', 'dF', 'df', 'd%', 'd6',
            '1d6', '1dF', '1df', '1d%',
            '10d6', '10dF', '10df', '10d%',
            '-d6', '-dF', '-df', '-d%',
            '-1d6', '-1dF', '-1df', '-1d%',
            '-10d6', '-10dF', '-10df', '-10d%',
        ].forEach(chunk => {
            it(`parses and runs: ${chunk}`, () => {
                const f = parse(chunk);
                expect(f).not.toBeNull();
                expect(f()).not.toBeNull();
            });
        });
    });

    describe('basic roll', () => {
        ['d6', '1d6', '2d3', '4d10'].forEach(expr => {
            it(`evaluates correctly: ${expr}`, () => {
                const s = spyOn(random, 'die');
                s.withArgs(6).and.returnValue(4);
                s.withArgs(3).and.returnValue(2);
                s.withArgs(10).and.returnValue(1);
                expect(parse(expr)()).toBe(4);
            });
        });
        it('supports fudge dice', () => {
            const s = spyOn(random, 'die').withArgs(3).and.returnValues(1, 2, 3);
            const f = parse('3dF');
            expect(f).not.toBeNull();
            expect(f()).toBe(0);
            expect(s.calls.count()).toBe(3);
        });
        it('supports centile dice', () => {
            const s = spyOn(random, 'die').withArgs(100).and.returnValues(60, 5, 31);
            const f = parse('3d%');
            expect(f).not.toBeNull();
            expect(f()).toBe(96);
            expect(s.calls.count()).toBe(3);
        });
    });

    describe('negative roll', () => {
        ['-d6', '-1d6', '-2d3', '-4d10'].forEach(expr => {
            it(`evaluates correctly: ${expr}`, () => {
                const s = spyOn(random, 'die');
                s.withArgs(6).and.returnValue(4);
                s.withArgs(3).and.returnValue(2);
                s.withArgs(10).and.returnValue(1);
                expect(parse(expr)()).toBe(-4);
            });
        });
    });
});

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
});

