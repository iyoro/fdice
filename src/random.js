/**
 * @file Defines randomisation functions; kept separate to allow simpler mocking.
 */
import random from 'lodash/random.js';
export const die = sides => random(1, sides);

// Exporting an object allows simpler mocking of random elements in tests.
export default { die };
