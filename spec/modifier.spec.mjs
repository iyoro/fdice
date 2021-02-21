import { parse, twice, reroll, dropHighest, dropLowest, explode, keepHighest, keepLowest } from '../src/fdice.js';
import random from '../src/random.js';

describe('Modifier', () => {
    describe('dice chunk', () => {
        [
            'd20r', 'd20r1', 'd20R20', // reroll,
            'd10t', 'd10t10', 'd10T10', // count twice
            '2d20kh', '2d20kh1', '2d20KH1', // keep highest
            '2d20kl', '2d20kl1', '2d20KL1', // keep lowest
            '8d6dh', '8d6dh4', '8d6DH4',   // drop highest
            '8d6dl', '8d6dl4', '8d6DL4',   // drop lowest
            '4d10!', 'd6!', 'd6!1', '4d20!20', // explosion
            '2d%kh1', '2d%dl1', '4dFr-1', '3dF!', '3dft', // non-standard dice with modifiers
            '1d1dl1', '-1d1dl1', '1d1dh1', '-1d1dh1', // will always roll 0 but valid
            '1d1kl1', '-1d1kl1', '1d1kh1', '-1d1kh1', // will always roll 1 but valid
        ].forEach(expr => {
            it(`will parse: ${expr}`, () => {
                expect(() => parse(expr)).not.toThrow(); // 'actual' for toThrow must be a func.
            });
        });
    });

    it('is applied', () => {
        const s = spyOn(random, 'die').withArgs(10).and.returnValues(3, 1, 8, 10);
        const dice = parse('4d10t10');
        expect(dice()).toBe(32);
        expect(s.calls.count()).toBe(4);
    });

    describe('twice', () => {
        it('is calculated correctly', () => {
            const reroll = jasmine.createSpy();
            const f = twice(6, reroll);
            const result = f([1, 2, 3, 4, 5, 6, 1, 2]);
            expect(result).toEqual([1, 2, 3, 4, 5, 6, 6, 1, 2]);
            expect(result.length).toBe(9);
            expect(reroll.calls.count()).toBe(0);
        });
    });

    describe('discard and reroll', () => {
        it('is calculated correctly', () => {
            const mockReroll = jasmine.createSpy().and.returnValues([3], [5]);
            const f = reroll(1, mockReroll);
            const result = f([1, 2, 3, 4, 5, 6, 1, 2]);
            expect(result).toEqual([3, 2, 3, 4, 5, 6, 5, 2]);
            expect(result.length).toBe(8);
            expect(mockReroll.calls.count()).toBe(2);
        });
    });

    describe('keep highest', () => {
        it('is calculated correctly', () => {
            const reroll = jasmine.createSpy();
            const f = keepHighest(3, reroll);
            const result = f([6, 5, 1, 1, 2, 3, 4]);
            expect(result).toEqual(jasmine.arrayContaining([6, 5, 4]));
            expect(result.length).toBe(3);
            expect(reroll.calls.count()).toBe(0);
        });
    });

    describe('keep lowest', () => {
        it('is calculated correctly', () => {
            const reroll = jasmine.createSpy();
            const f = keepLowest(3, reroll);
            const result = f([6, 5, 1, 1, 2, 3, 4]);
            expect(result).toEqual(jasmine.arrayContaining([1, 1, 2]));
            expect(result.length).toBe(3);
            expect(reroll.calls.count()).toBe(0);
        });
    });

    describe('drop highest', () => {
        it('is calculated correctly', () => {
            const reroll = jasmine.createSpy();
            const f = dropHighest(3, reroll);
            const result = f([6, 5, 1, 1, 2, 3, 4]);
            expect(result).toEqual(jasmine.arrayContaining([1, 1, 2, 3]));
            expect(result.length).toBe(4);
            expect(reroll.calls.count()).toBe(0);
        });
    });

    describe('drop lowest', () => {
        it('is calculated correctly', () => {
            const reroll = jasmine.createSpy();
            const f = dropLowest(3, reroll);
            const result = f([6, 5, 1, 1, 2, 3, 4]);
            expect(result).toEqual(jasmine.arrayContaining([6, 5, 4, 3]));
            expect(result.length).toBe(4);
            expect(reroll.calls.count()).toBe(0);
        });
    });

    describe('explode', () => {
        it('is calculated correctly', () => {
            const reroll = jasmine.createSpy().and.returnValues([10], [9], [8], [7]);
            const f = explode(10, reroll);
            // n.b. the order will actually be 1, 10, 10, 7, 2, 10, 9, 3, 10, 8 as these are done iteratively, all
            // the initial 10s then all the 2nd round etc. Don't care about the exact order.
            expect(f([1, 10, 2, 10, 3, 10])).toEqual(jasmine.arrayContaining([1, 10, 2, 10, 3, 10, 10, 9, 8, 7]));
            expect(reroll.calls.count()).toBe(4);
        });
    });

    describe('on special dice', () => {
        it('supports fudge dice', () => {
            // Aim to test that the 'special' range of a dF gets modified correctly.
            const s = spyOn(random, 'die').withArgs(3).and.returnValues(1, 2, 3, 3, 1); // -1, 0, 1, 1, -1
            let f = parse('3dF!');
            expect(f).not.toBeNull();
            expect(f()).toBe(0);
            expect(s.calls.count()).toBe(5);
            // Explode on negative should work
            s.withArgs(3).and.returnValues(2, 3, 1, 1, 3); // 0, 1, -1, -1, 1
            f = parse('3dF!-1');
            expect(f).not.toBeNull();
            expect(f()).toBe(0);
            expect(s.calls.count()).toBe(10);
            // As should discard/reroll 
            s.withArgs(3).and.returnValues(3, 2, 1, 2); // 1, 0, -1, 0
            f = parse('3dFr-1');
            expect(f).not.toBeNull();
            expect(f()).toBe(1);
            expect(s.calls.count()).toBe(14);
            // As should keep/drop
            s.withArgs(3).and.returnValues(3, 2, 1); // 1, 0, -1
            f = parse('3dFkl2');
            expect(f).not.toBeNull();
            expect(f()).toBe(-1);
            expect(s.calls.count()).toBe(17);
        });

        it('supports centile dice', () => {
            const s = spyOn(random, 'die').withArgs(100).and.returnValues(10, 100, 50, 1);
            let f = parse('3d%!');
            expect(f).not.toBeNull();
            expect(f()).toBe(161);
            expect(s.calls.count()).toBe(4);

            s.withArgs(100).and.returnValues(10, 1, 100, 50);
            f = parse('3d%!1');
            expect(f).not.toBeNull();
            expect(f()).toBe(161);
            expect(s.calls.count()).toBe(8);
            // keep should work
            s.withArgs(100).and.returnValues(10, 20, 50, 60, 70);
            f = parse('5d%dh3');
            expect(f).not.toBeNull();
            expect(f()).toBe(30);
            expect(s.calls.count()).toBe(13);
        });
    });

    /*
    A summary view of the expected keep/drop logic, * indicates a dice that is returned.
    9d10 rolls:    1 2 3 4 5 6 7 8 9 (face values)
    KH                             *
    KH3                        * * *
    DL3                  * * * * * *
    DL               * * * * * * * *
    DH             * * * * * * * *
    DH3            * * * * * *
    KL3            * * *
    KL             *
    */
    describe('default argument', () => {
        [
            ['4d6kl', '4d6kl1'],
            ['4d6kl', '4d6dh3'],
            ['4d6kh', '4d6kh1'],
            ['4d6kh', '4d6dl3'],
            ['4d6dl', '4d6dl1'],
            ['4d6dl', '4d6kh3'],
            ['4d6dh', '4d6dh1'],
            ['4d6dh', '4d6kl3'],
        ].forEach(pair => {
            it(`${pair[0]} is equivalent to ${pair[1]}`, () => {
                const s = spyOn(random, 'die').withArgs(6).and.returnValues(1, 2, 3, 4, 1, 2, 3, 4);
                const f = parse(pair[0]);
                const g = parse(pair[1]);
                expect(f()).toEqual(g());
            });
        });
    });
});
