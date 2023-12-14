const $0 = x => x + 1;
const result = $0(1);

const ast = [
  {
    type: 'BinaryExpression',
    left: { type: 'NumberLiteral', value: '1' },
    op: { type: 'PIPELINE', value: '|>' },
    right: {
      type: 'ArrowFunctionExpression',
      id: null,
      params: [{ type: 'Identifier', id: 'x' }],
      body: [
        {
          type: 'FunctionCallExpression',
          callee: { type: 'Identifier', id: 'add' },
          args: [
            { type: 'NumberLiteral', value: '3' },
            { type: 'Identifier', id: 'x' },
          ],
        },
      ],
    },
  },
];

const _ast = [
  {
    type: 'Declaration',
    id: { type: 'Identifier', id: '$0' },
    init: {
      type: 'ArrowFunctionExpression',
      id: null,
      params: [{ type: 'Identifier', id: 'x' }],
      body: [
        {
          type: 'FunctionCallExpression',
          callee: { type: 'Identifier', id: 'add' },
          args: [
            { type: 'NumberLiteral', value: '3' },
            { type: 'Identifier', id: 'x' },
          ],
        },
      ],
    },
  },
  {
    type: 'FunctionCallExpression',
    callee: { type: 'Identifier', id: '$0' },
    args: [{ type: 'NumberLiteral', value: '1' }],
  },
];
