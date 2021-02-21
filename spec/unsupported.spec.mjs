import { parse } from '../src/fdice.js';

describe('Unsupported', () => {
    // Known bad expressions that should not parse to anything. Chunks tested elsewhere.
    describe('operator', () => {
        ['5/2', '5*2', '2d20/2', '2d20*2', 'd6+5/2', '2*d6+1', '-2*d20', '-2/d20'].forEach(expr => {
            it(`is invalid: ${expr}`, () => {
                expect(() => parse(expr)).toThrow(); // 'actual' for toThrow must be a func.
            })
        });
    });

    describe('chunk', () => {
        [
            'garbage', '+garbage', '-garbage', 'x6', '6x6', 'F', '%', // misc garbage
            'd-6', 'd-F', 'd-%', 'dA', '3dB',  // nonsense dice
            '+-2', '-+2', // operator confusion
        ].forEach(chunk => {
            it(`is invalid: ${chunk}`, () => {
                expect(() => parse(chunk)).toThrow(); // 'actual' for toThrow must be a func.
            });
        });
    });

    describe('modifier', () => {
        [
            '6d20f9',           // made up modifier 'f'
            '4d10k', '4d10d',   // Keep/drop without specifying what
            '4d10k1', '4d10d1',
            '4d10h', '4d10l',   // Counter-intuitive drop highest/lowest modifiers (they specify what you don't want).
            '4d10h2', '4d10l2',
        ].forEach(expr => {
            it(`is invalid: ${expr}`, () => {
                expect(() => parse(expr)).toThrow(); // 'actual' for toThrow must be a func.
            })
        });
    });
});
