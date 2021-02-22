/**
 * @file Module glue.
 */
import {
    parse,
    DieTooBigError,
    ExpressionTooLongError,
    InvalidChunkError,
    RollLimitExceededError,
    TooManyChunksError,
    TooManyDiceError
} from './fdice.js';
export {
    parse,
    DieTooBigError,
    ExpressionTooLongError,
    InvalidChunkError,
    RollLimitExceededError,
    TooManyChunksError,
    TooManyDiceError
}
export default parse;
