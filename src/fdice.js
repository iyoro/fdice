/**
 * @file Supports parsing of dice expression chunks like "3d6" or "+2" to produce callable roll functions.
 */
import curry from 'lodash/curry.js';
import dropWhile from 'lodash/dropWhile.js';
import flow from 'lodash/flow.js';
import isNil from 'lodash/isNil.js';
import memoize from 'lodash/memoize.js';
import takeWhile from 'lodash/takeWhile.js';
import toSafeInteger from 'lodash/toSafeInteger.js';
import toString from 'lodash/toString.js';
import toLower from 'lodash/toLower.js';

import random from './random.js';

/**
 * Helper for reducing values via summation.
 * @ignore
 */
const sum = (acc, val) => acc + val;

/**
 * Comparator for ascending sort of numbers.
 * @ignore
 */
const asc = (a, b) => a - b;

/**
 * Comparator for descending sort of numbers.
 * @ignore
 */
const desc = (a, b) => b - a;

/**
 * Replace all instances of one string in another.
 * 
 * @function
 * @param {string} needle What to find.
 * @param {string} newneedle What to replace it with.
 * @param {string} haystack What to look in.
 * @returns {string} Replacement haystack.
 */
const replaceAll = curry((needle, newNeedle, haystack) => haystack.split(needle).join(newNeedle));

/**
 * Indicates the expression is too long to parse.
 */
export class ExpressionTooLongError extends Error { }

/**
 * Indicates invalid chunks were found while parsing an expression.
 */
export class InvalidChunkError extends Error { }

/**
 * Indicates one or more chunks in the expression use a dice with too many sides
 */
export class DieTooBigError extends Error { }

/**
 * Indicates the chunks in the expression, combined, use too many dice.
 */
export class TooManyDiceError extends Error { }

/**
 * Indicates that a dice expression was terminated early because it tried to use too many dice. This error captures
 * cases where TooManyDiceError wasn't triggered at parse time, but modifiers resulted in exceeding the limit later on.
 */
export class RollLimitExceededError extends Error { }

/**
 * Indicates that a dice expression contained too many chunks, not including whitespace.
 */
export class TooManyChunksError extends Error { }

/**
 * The larges number of chunks allowed in one expression.
 */
const MAX_CHUNKS = 10;

/**
 * The largest number of dice that may be performed by one chunk, including modifiers, and also the 
 * largest allowable static dice pool.
 */
const MAX_DICE = 100;

/**
 * The largest number of faces allowed on any die in a roll expression.
 */
const MAX_FACES = 1000;

/**
 * The largest expression that may be parsed.
 */
const MAX_LENGTH = 60;

/**
 * Matches modifiers used in dice expressions.
 *  - rN discard and reroll Ns
 *  - tN count Ns twice
 *  - dN, kN, dlN, dhN, klN, khN drop lowest or keep highest N
 *  - !N explode on N (keep and reroll)
 * 
 * @type {string}
 */
const DICE_MODIFIERS = '[dk][lh]\\d*|[rt!][+-]?\\d*';

/**
 * Matches a dice expression like 2d4, d% or dF, maybe followed by some complex modifiers.
 * 
 * @type {string}
 */
const DICE_CHUNK = `(?<num>\\d*)d(?<die>f|%|[\\d]+)(?<modifier>${DICE_MODIFIERS})?`;

/**
 * Matches a valid chunk, either die or constant.
 * 
 * @type {RegExp}
 */
const VALID_CHUNK = new RegExp(`^([+-]?)(${DICE_CHUNK}|\\d+)$`);

/**
 * Test if a chunk is invalid.
 * 
 * @param {string} chunk The chunk to check.
 * @returns {boolean} Whether the chunk is supported.
 */
const isInvalidChunk = chunk => !VALID_CHUNK.test(chunk);

/**
 * Splits an expression into chunks. The split is at a point in the expression where there is a +/- that is not
 * preceeded by a modifier which accepts a signed argument.
 * 
 * @param {string} str Input string e.g. 3d6+1-2d2+4dFr-1
 * @returns {Array<string>} Tokens from s, e.g. ["3d6", "+1", ...]
 */
const chunk = str => str.split(/(?<![rt!])(?=[+-])/);

/**
 * @name ModifierFunction
 * @function 
 * @param {Array<number>} rolls The initial rolls to modify.
 * @returns {Array<number>} Replacement rolls after modification.
 */

/**
 * The 'discard and reroll' modifier: Discard dice matching arg and re-roll them once only.
 * 
 * @param {number} arg The value to discard.
 * @param {function} reroll A function to roll a further die.
 * @returns {ModifierFunction} A discard modifier for the given value and reroll func.
 */
export const reroll = (arg, reroll) => rolls => rolls.map(r => r === arg ? reroll()[0] : r);

/**
 * The 'count twice' modifier: Instances of the argument are doubled.
 * 
 * @param {number} arg The value to count twice.
 * @param {function} reroll Not used.
 * @returns {ModifierFunction} A twice modifier for the given value.
 */
export const twice = (arg, reroll) => rolls => rolls.flatMap(r => r === arg ? [r, r] : r);

/**
 * The 'keep highest N' modifier; the other rolls are discarded.
 *
 * @param {number} arg The number of values to keep.
 * @param {function} reroll Not used.
 * @returns {ModifierFunction} A keep modifier for the given number of values.
 */
export const keepHighest = (arg, reroll) => rolls => takeWhile(rolls.sort(desc), (v, i) => i < arg);

/**
 * The 'keep lowest N' modifier; the lower N rolls are kept, others are discarded.
 *
 * @param {number} arg The number of values to keep.
 * @param {function} reroll Not used.
 * @returns {ModifierFunction} A drop modifier for the given number of values.
 */
export const keepLowest = (arg, reroll) => rolls => takeWhile(rolls.sort(asc), (v, i) => i < arg);

/**
 * The 'drop lowest N' modifier; the lower N rolls are discarded.
 *
 * @param {number} arg The number of values to drop.
 * @param {function} reroll Not used.
 * @returns {ModifierFunction} A drop modifier for the given number of values.
 */
export const dropLowest = (arg, reroll) => rolls => dropWhile(rolls.sort(asc), (v, i) => i < arg);

/**
 * The 'drop highest N' modifier; the upper N rolls are discarded.
 *
 * @param {number} arg The number of values to drop.
 * @param {function} reroll Not used.
 * @returns {ModifierFunction} A drop modifier for the given number of values.
 */
export const dropHighest = (arg, reroll) => rolls => dropWhile(rolls.sort(desc), (v, i) => i < arg);

/**
 * The 'exploding dice' modifier: rolls matching the argument are kept and re-rolled, and this process may chain until
 * the operator exceeds the allowable number of dice.
 *
 * @param {number} arg The exploding value.
 * @param {function} reroll A function to roll a further die.
 * @returns {ModifierFunction} An explosion modifier for the given target value.
 */
export const explode = (arg, reroll) => rolls => {
    let newRolls = rolls;
    let sentinel = MAX_DICE - rolls.length;
    while (sentinel-- > 0 && newRolls.some(i => i === arg)) {
        newRolls = newRolls.flatMap(r => r === arg ? ['X', reroll()[0]] : r);
    }
    if (sentinel < 0) {
        throw new RollLimitExceededError(`Explosion exceeded roll limit: ${newRolls.length} > ${MAX_DICE}`);
    }
    return newRolls.flatMap(r => r === 'X' ? arg : r);
};

/**
 * Mapping of chunk tokens for modifiers to the implementing function.
 */
const modifierFunctions = {
    'R': reroll,
    'T': twice,
    '!': explode,
    'KH': keepHighest,
    'KL': keepLowest,
    'DH': dropHighest,
    'DL': dropLowest,
};

/**
 * Produces a suitable default for the argument for each modifier given the modifier token and the lowest and highest
 * possible roll for the die being modified.
 * 
 * @param {string} modifier The chunk token for the modifier.
 * @param {number} lowest The lowest value that may be rolled on the die being modified.
 * @param {number} highest The highest value that may be rolled on the die being modified.
 * @returns {number} The default argument for the modifier.
 */
const defaultModifierArg = (modifier, num, lowest, highest) => {
    switch (modifier) {
        // Re-roll, twice and explode.
        case 'R': return lowest;
        case 'T': return highest;
        case '!': return highest;
        // Keeps/drops; the arg is the number TO keep or drop.
        default:
            return Math.min(1, num - 1); // Keep or drop all but one.
    }
};

/**
 * Creates a function which modifies a list of rolls, producing a replacement list.
 * 
 * @param {string} modifier The chunk token describing the modifier (e.g. "k2" or "!").
 * @param {function} reroll A function that the modifier can use to roll an additional die.
 * @param {number} num The number of dice in the roll.
 * @param {number} highest The highest value for any single die roll.
 * @param {number} lowest The loewst value for any single die roll.
 * @return {function} Prepared modifier function. Accepts an array of rolls and returns the result of modifying it
 * with the named modifier.
 */
const createModifier = (modifier, reroll, num, highest, lowest) => {
    if (isNil(modifier)) {
        return rolls => rolls;
    }
    let { func, rest } = modifier.match(/(?<func>[a-z!]+)(?<rest>.*)/).groups
    func = func.toUpperCase();
    // Arg is optional, and each modifier has its own suitable default.
    const arg = rest.length == 0 ? defaultModifierArg(func, num, highest, lowest) : toSafeInteger(rest);
    return modifierFunctions[func](arg, reroll);
};

/**
 * Creates a function producing functions that roll a number of dice of a given size. Calling this func with
 * die = 6 returns a function, calling that with the parameter 4 returns a function that rolls 4d6. For dice that
 * roll outside the range 1..N, the offset can be used to shift the result: die = 3, offset = -2 produces -1, 0, 1 (dF).
 * 
 * @param {number} die Number of faces on the die.
 * @param {number} offset An offset to apply to every roll of the dice. Used for e.g. dF.
 * @return {function} A function which may be called to return a roll function for some number of dice.
 */
const diceFunc = (die, offset) => num => () => new Array(num).fill(0).map(() => random.die(die) + offset);

/**
 * @name ChunkFunction
 * @function
 * @return {function} A function which evaluates the complete chunk when it is called.
 */

/**
 * Creates a function that rolls a number of dice and applies any modifiers according to the given expression chunk.
 * The result of each dice roll is summed and then optionally negated if the chunk as a whole is negative.
 *
 * @function
 * @param {string} chunk An expression chunk representing a dice roll, like '-4d6'.
 * @returns {ChunkFunction} A function which computes the chunk value.
 */
const createRoll = memoize(chunk => {
    const negative = chunk.startsWith('-');
    const rollExpr = chunk.substr(negative || chunk.startsWith('+') ? 1 : 0);
    let { num, die, modifier } = rollExpr.match(DICE_CHUNK).groups;
    num = isNil(num) || num.length === 0 ? 1 : toSafeInteger(num);
    if (num > MAX_DICE) {
        throw new TooManyDiceError(`Dice pool is too large: ${num} > ${MAX_DICE}`);
    }
    die = die.toUpperCase();
    // Special named die; every dF is a d3-2, and d% is an alias for d100.
    const offset = die === 'F' ? -2 : 0;
    die = die === '%' ? 100 : die === 'F' ? 3 : toSafeInteger(die);
    if (die > MAX_FACES) {
        throw new DieTooBigError(`Die has too many faces: ${die} > ${MAX_FACES}`);
    }
    const rollDice = diceFunc(die, offset);
    const applyModifier = createModifier(modifier, rollDice(1), num, 1 + offset, die + offset);
    const maybeNegate = roll => negative ? roll.map(r => -r) : roll;
    return flow(rollDice(num), applyModifier, maybeNegate);
});

/**
 * Creates a function that returns a constant.
 *
 * @param {string} chunk An expression chunk representing a constant, like "+1".
 * @returns {ChunkFunction} A function which computes the chunk value.
 */
const createConst = chunk => () => toSafeInteger(chunk);

/**
 * Produces a chunk function for a chunk, which may be a constant or a dice expression.
 * 
 * @param {string} chunk An expression chunk.
 * @returns {ChunkFunction} A function which computes the chunk value.
 */
const createPart = chunk => (chunk.indexOf('d') === -1 ? createConst : createRoll)(chunk);

/**
 * Produces a function for a given complete dice roll expression which, when called with no params, will evaluate the
 * result of that expression.
 * 
 * @function
 * @param {string} expr A full dice expression which may consist of multiple parts (e.g. "3d6-4+2d4").
 * @returns {function} A function that will evaluate the result of the dice expression when it's called.
 */
export const parse = memoize((expr) => {
    if (expr.length > MAX_LENGTH) {
        throw new ExpressionTooLongError(`Expression is too long: ${expr.length} > ${MAX_LENGTH}`);
    }
    // Tidy and split into chunks: 3d6 + 1 -2 d2 => "3d6", "+1", "-2d2"
    const chunks = flow(toString, toLower, replaceAll(' ', ''), chunk)(expr);
    if (chunks.length > MAX_CHUNKS) {
        throw new TooManyChunksError(`Expression contains too many chunks: ${chunks.length} > ${MAX_CHUNKS}`);
    }
    if (chunks.some(isInvalidChunk)) {
        throw new InvalidChunkError(`"${expr}" contains invalid or unsupported parts: ${chunks.filter(isInvalidChunk)}`);
    }
    const parts = chunks.map(createPart);
    const roll = () => parts.map(part => part());
    return (reduce = true) => reduce ? roll().flat().reduce(sum) : roll();
});

export default parse;
