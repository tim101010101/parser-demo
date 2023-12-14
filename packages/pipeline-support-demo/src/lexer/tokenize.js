import {
  panicAt,
  isDigit,
  isAlpha,
  isWs,
  isAlphaNumeric,
} from '../utils/index.js';
import { Token } from './token.js';
import { TokenType } from './tokenType.js';
import { keywords } from '../constants.js';

export class Lexer {
  input;
  pos;

  constructor(input) {
    this.input = input;
    this.pos = 0;
  }

  skipWhiteSpace() {
    while (isWs(this.input[this.pos])) {
      this.pos++;
    }
  }

  getNextToken() {
    this.skipWhiteSpace();

    if (this.pos >= this.input.length) return null;

    const cur = this.input[this.pos];

    if (isDigit(cur)) {
      let number = '';
      while (isDigit(this.input[this.pos])) {
        number += this.input[this.pos++];
      }
      return new Token(TokenType.NumberLiteral, number);
    }

    if (isAlpha(cur)) {
      let identifier = '';
      while (isAlphaNumeric(this.input[this.pos])) {
        identifier += this.input[this.pos++];
      }
      return new Token(
        keywords.has(identifier) ? TokenType.Keyword : TokenType.Identifier,
        identifier
      );
    }

    if (cur === "'" || cur === '"') {
      this.pos++; // Skip the left quote

      let stringLiteral = '';
      while (this.input[this.pos] !== cur) {
        stringLiteral += this.input[this.pos++];
      }

      this.pos++; // Skip the right quote

      return new Token(TokenType.StringLiteral, stringLiteral);
    }

    if (Token.isOp(cur)) {
      this.pos++;
      return Token.fromOp(cur);
    }

    return panicAt(`Unexpected token: ${cur}`);
  }

  tryMerge(tokens, prev, cur) {
    const prevType = prev.type;
    const curType = cur.type;

    // ===
    if (prevType === TokenType.Eqeq && curType === TokenType.Eq) {
      tokens.pop();
      tokens.push(new Token(TokenType.Eqeqeq, '==='));
    }

    // ==
    else if (prevType === TokenType.Eq && curType === TokenType.Eq) {
      tokens.pop();
      tokens.push(new Token(TokenType.Eqeq, '=='));
    }

    // |>
    else if (
      prevType === TokenType.VerticalLine &&
      curType === TokenType.MoreThan
    ) {
      tokens.pop();
      tokens.push(new Token(TokenType.Pipeline, '|>'));
    }

    // =>
    else if (prevType === TokenType.Eq && curType === TokenType.MoreThan) {
      tokens.pop();
      tokens.push(new Token(TokenType.Arrow, '=>'));
    }

    //
    else {
      tokens.push(cur);
    }
  }

  tokenize() {
    const tokens = [];

    let token = null;
    let top = null;
    while ((token = this.getNextToken())) {
      // try to merge some operators
      if (top) {
        this.tryMerge(tokens, top, token);
      } else {
        tokens.push(token);
      }

      top = tokens[tokens.length - 1];
    }

    return tokens;
  }
}
