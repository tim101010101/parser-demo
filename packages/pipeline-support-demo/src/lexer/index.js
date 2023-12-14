import { Lexer } from './tokenize.js';

export const tokenize = source => {
  const lexer = new Lexer(source);
  return lexer.tokenize();
};

export * from './token.js';
export * from './tokenType.js';
