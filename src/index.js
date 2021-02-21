/**
 * @file Module glue.
 */
import { parse, DieTooBigError, InvalidChunkError, RollLimitExceededError, TooManyChunksError, TooManyDiceError } from './fdice.js';
export { parse, DieTooBigError, InvalidChunkError, RollLimitExceededError, TooManyChunksError, TooManyDiceError }
export default parse;
