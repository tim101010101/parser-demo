export const TokenType = {
  Keyword: 'KEYWORD',
  Identifier: 'IDEN',

  NumberLiteral: 'LIT_NUMBER',
  StringLiteral: 'LIT_STRING',

  Semi: 'SEMI',
  Comma: 'COMMA',
  Dot: 'DOT',
  Eq: 'EQ',
  LessThan: 'LESS_THAN',
  MoreThan: 'MORE_THAN',
  Plus: 'PLUS',
  Sub: 'SUB',
  Mul: 'MUL',
  Div: 'DIV',
  VerticalLine: 'VerticalLine',

  LeftParenthesis: 'L_PAREN',
  RightParenthesis: 'R_PAREN',
  LeftBrace: 'L_BRACE',
  RightBrace: 'R_BRACE',

  Eqeq: 'EQEQ', // ==
  Eqeqeq: 'EQEQEQ', // ===
  Arrow: 'ARROW', // =>
  Pipeline: 'PIPELINE',

  Unknown: 'UNKNOWN',
};
