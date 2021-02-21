/**
 * @file A smoke test for fundamental ability to import and use the module.
 */
import parse from '../src/index.js';

describe('Library', () => {
    it('can be used', () => {
        const f = parse('1d4');
        expect(parse).toEqual(jasmine.any(Function));
        expect(f).toEqual(jasmine.any(Function));
    });
});
