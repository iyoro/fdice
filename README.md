# fdice 

fdice is a library for creating callable roll functions from dice expressions. The library is packaged as an ESM module.

```js
import parse from 'fdice';

let roll = parse("2d6");
let result = roll();
```

# Dice notation

`fdice` has its own idea about dice pool modifiers (keep/drop, etc) but otherwise the syntax is fairly conventional.

Notation | Description
--- | ---
`d20`     | Roll a 20-sided die 
`4d6`     | Roll a 6-sided die 4 times
`4d6+2`   | Add a constant to the rolled value
`3dF`     | Roll 3 Fudge/Fate dice (faces -1, 0, 1)
`d%`      | Roll a percentile die (identical to `d100`)
`4d6kh`   | Keep only the highest die
`4d6kh3`  | Keep the 3 highest dice
`4d6kl`   | Keep only the lowest die
`4d6kl3`  | Keep the 3 lowest dice
`4d6dh`   | Discard the highest die
`4d6dh3`  | Discard the 3 highest dice
`4d6dl`   | Discard the lowest die
`4d6dl3`  | Discard the 3 lowest dice
`1d20r`   | Roll a d20, re-roll on 1 (defaults to lowest face value)
`1d20r20` | Roll a d20, re-roll on 20
`1d10t`   | Roll a d10, count 10s twice (defaults to highest face value)
`1d10t3`  | Roll a d10, count 3s twice
`7d10!`   | Exploding dice, 10s explode (defaults to highest face value)
`7d10!1`  | Exploding dice, 1s explode

Modifiers that accept a face value argument will work with `dF` (face values {-1, 0, 1}) and `d%` (1..100).

Modifiers that accept a number-of-dice argument default to 1 die if it is not provided.

D&D advantage can be rolled using either `2d20kh` or `2d20dl`. Likewise disadvantage can be `2d20kl` and `2d20dh`.

# Unreduced results

By default, the roll function returned by `parse(expr)` will reduce the entire expression to a single result value.
The roll function itself takes an optional boolean parameter (default is `true`) to control this. Pass false to create a function which returns the individual rolls and constants in the expression as a nested array.
Each dice pool in the expression results in an array of all of its rolls, and each constant resolves to itself.
If a dice pool is negative then all of its rolls will be negative.

The total result can be obtained by flattening and summing the returned array.

```js
// Dice pools produce an array:
parse('4d6')(false); // => [[3, 1, 3, 2]]
// Negative dice pools result in negative values,
parse('-4d6')(false); // => [[-3, -1, -3, -2]]
// Constants will appear as-is,
parse('d6 + 2')(false); // [[4], 2]
// Extra dice rolled by modifiers will appear:
parse('4d10!')(false); // => [[3, 10, 4, 6, 10, 7]]
```

# Backlog

* Evaluation of equalities to a boolean output, i.e. `3d10 >= 17`, `1d20 < 1d20` and so on.
* Multiple arguments for e.g. reroll and twice: `4d10t9,10` or possibly just use chaining `4d10t10t9` -- are these functionally equivalent? Would need to repeat the chain until no changes.
* Chaining of modifiers: `6d8!kl4kh2r5` or `3dFt-1dl2`
* Think about `/` and `*` (order of evaluation problems -- no longer simply ltr?)
* Tree-shakable version using lodash-es (or just lodash if supported)
