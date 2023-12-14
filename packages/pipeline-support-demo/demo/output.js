import assert from 'assert';
const add = (x, y) => x + y;
const addOne = x => add(1, x);
const addTwo = x => add(2, x);
const $0 = x => add(3, x);
const result = $0(addTwo(addOne(1)));
assert.ok(result === 7);
