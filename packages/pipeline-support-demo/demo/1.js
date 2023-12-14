import assert from 'assert';

const add = (x, y) => x + y;

const addOne = x => add(1, x);
const addTwo = x => add(2, x);

const result = 1 |> addOne |> addTwo |> x => add(3, x);

assert.ok(result === 7);
