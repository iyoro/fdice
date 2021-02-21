import { parse } from '../src/fdice.js';

describe('Constant', () => {
    describe('chunk', () => {
        ['-3', '3', '+3', '-0', '0', '+0', '-20', '20'].forEach(chunk => {
            it(`evalutates to ${chunk}`, () => {
                const f = parse(chunk);
                expect(f).not.toBeNull();
                expect(f()).toBe(parseInt(chunk));
            })
        });
    });
    describe('expression', () => {
        it('parses correctly', () => {
            expect(parse('6')).not.toBeNull();
            expect(parse('6+1')).not.toBeNull();
            expect(parse('6-1')).not.toBeNull();
            expect(parse('-6-1')).not.toBeNull();
            expect(parse('-6+1')).not.toBeNull();
        });
    });
});
