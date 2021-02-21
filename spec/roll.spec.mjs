import { parse } from '../src/fdice.js';
import random from '../src/random.js';

describe('roll', () => {
    it('is reduced by default', () => {
        const s = spyOn(random, 'die')
            .withArgs(6).and.returnValues(3, 2, 4, 1)
            .withArgs(4).and.returnValues(1, 3);
        const roll = parse('4d6+1-2d4+2');
        expect(roll()).toBe(9);
    });
    it('can be unreduced', () => {
        const s = spyOn(random, 'die')
            .withArgs(6).and.returnValues(3, 2, 4, 1)
            .withArgs(4).and.returnValues(1, 3);
        const roll = parse('4d6+1-2d4+2');
        expect(roll(false)).toEqual([[3, 2, 4, 1], 1, [-1, -3], 2]);
    });
    it('has modifiers applied even when unreduced', () => {
        const s = spyOn(random, 'die').withArgs(10).and.returnValues(7, 10, 5, 4, 10, 3);
        const roll = parse('4d10!');
        // Order differs from spy cos 4d10 is rolled then checked for rerolls, which get inserted after the die that caused them.
        expect(roll(false)).toEqual([[7, 10, 10, 3, 5, 4]]);
    });
});

