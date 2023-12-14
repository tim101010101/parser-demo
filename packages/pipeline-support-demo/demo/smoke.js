import assert from 'assert';

const add = (x, y) => x + y;

// Currify
const addOne = x => add(1, x);
const addTwo = x => add(2, x);

// Feature: "|>"
const result =
  1 // 1
  |> addOne // 2
  |> addTwo // 4
  |> x => add(3, x); // 7

assert.ok(result === 7);
