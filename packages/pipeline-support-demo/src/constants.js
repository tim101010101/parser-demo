import { TokenType } from './lexer/index.js';

export const keywords = new Set([
  'const',
  'let',
  'function',
  'require',
  'import',
  'from',
  'export',
]);

export const BinaryOps = new Set([
  TokenType.LessThan,
  TokenType.MoreThan,
  TokenType.Plus,
  TokenType.Sub,
  TokenType.Mul,
  TokenType.Div,
  TokenType.VerticalLine,
  TokenType.Eqeq,
  TokenType.Eqeqeq,
  TokenType.Pipeline,
]);
