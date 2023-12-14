import { panicAt } from '../utils/index.js';
import { TokenType } from './tokenType.js';

const ops = new Set([
  ';',
  ',',
  '.',
  '=',
  '<',
  '>',
  '+',
  '-',
  '*',
  '/',
  '|',
  '(',
  ')',
  '{',
  '}',
]);

export class Token {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }

  static isOp(char) {
    return ops.has(char);
  }

  static fromOp(source) {
    let type = TokenType.Unknown;

    switch (source) {
      case ';':
        type = TokenType.Semi;
        break;
      case ',':
        type = TokenType.Comma;
        break;
      case '.':
        type = TokenType.Dot;
        break;
      case '=':
        type = TokenType.Eq;
        break;
      case '<':
        type = TokenType.LessThan;
        break;
      case '>':
        type = TokenType.MoreThan;
        break;
      case '+':
        type = TokenType.Plus;
        break;
      case '-':
        type = TokenType.Sub;
        break;
      case '*':
        type = TokenType.Mul;
        break;
      case '/':
        type = TokenType.Div;
        break;
      case '|':
        type = TokenType.VerticalLine;
        break;

      case '(':
        type = TokenType.LeftParenthesis;
        break;
      case ')':
        type = TokenType.RightParenthesis;
        break;
      case '{':
        type = TokenType.LeftBrace;
        break;
      case '}':
        type = TokenType.RightBrace;
        break;

      default:
        break;
    }

    if (type === TokenType.Unknown) {
      return panicAt(`Unexpected Token: ${source}`);
    }

    return new Token(type, source);
  }
}
