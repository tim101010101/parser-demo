import { preProcess } from './pre/index.js';
import { tokenize } from './lexer/index.js';
import { parse } from './parser/index.js';
import { transform } from './transform/index.js';
import { codegen } from './codegen/index.js';

const code = `
import assert from 'assert';

const add = (x, y) => x + y;

// Currify
const addOne = x => add(1, x);
const addTwo = x => add(1 + 1, x);

// Feature: "|>"
const result =
  1 // 1
  |> addOne // 2
  |> addTwo // 4
  |> x => add(2 * 2 - 1, x); // 7

assert.ok(result === 7);

`;

// Pre-process
const source = preProcess(code);

// Front-end
const ast = parse(tokenize(source));

// Intermediate processing
const astAfterTransform = transform(ast);

// Back-end
const target = codegen(astAfterTransform);

console.log(target);

// import assert from "assert";
// const add = (x, y) => x + y;
// const addOne = x => add(1, x);
// const addTwo = x => add(2, x);
// const $0 = x => add(3, x);
// const result = $0(addTwo(addOne(1)));
// assert.ok(result === 7);
