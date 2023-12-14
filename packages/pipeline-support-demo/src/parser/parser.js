import {
  ArrowFunctionExpression,
  BinaryExpression,
  FunctionCallExpression,
  Identifier,
  ImportDeclaration,
  MemberExpression,
  NumberLiteral,
  Program,
  StringLiteral,
  VariableDeclaration,
  VariableDeclarator,
} from './node.js';
import { TokenType } from '../lexer/index.js';
import { panicAt } from '../utils/index.js';
import { BinaryOps } from '../constants.js';

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.currentTokenIndex = 0;
  }

  peek(step = 0) {
    return this.tokens[this.currentTokenIndex + step];
  }

  eat(expectedType, expectedValue = null) {
    const currentToken = this.tokens[this.currentTokenIndex];

    if (currentToken.type === expectedType) {
      if (expectedValue !== null && currentToken.value !== expectedValue) {
        return panicAt(`Unexpected token value: ${currentToken.value}`);
      }
      this.currentTokenIndex++;
      return currentToken;
    }

    return panicAt(`Unexpected token type: ${currentToken.type}`);
  }

  eatAny(expectedTypes) {
    const currentToken = this.tokens[this.currentTokenIndex];

    if (expectedTypes.includes(currentToken.type)) {
      this.currentTokenIndex++;
      return currentToken;
    }

    return panicAt(`Unexpected token type: ${currentToken.type}`);
  }

  eatOrNot(expectedType) {
    const currentToken = this.tokens[this.currentTokenIndex];

    if (currentToken.type === expectedType) {
      this.currentTokenIndex++;
      return currentToken;
    }

    return null;
  }

  parse() {
    const body = [];
    while (this.currentTokenIndex < this.tokens.length) {
      const statement = this.parseStatement();
      body.push(statement);
    }

    return new Program(body);
  }

  parseStatement() {
    const statement = this.parseDeclaration();
    this.eatOrNot(TokenType.Semi);
    return statement;
  }

  parseDeclaration() {
    const curToken = this.peek();

    // import foo from 'foo'
    // const foo = 'foo';
    if (curToken.type === TokenType.Keyword) {
      const kind = this.eat(TokenType.Keyword).value;

      // import foo from 'foo'
      if (kind === 'import') {
        return this.parseImportDeclaration();
      }

      // const foo = 'foo';
      else if (kind === 'const' || kind === 'let' || kind === 'var') {
        return this.parseVariableDeclaration(kind);
      }
    }

    // foo()
    else if (curToken.type === TokenType.Identifier) {
      return this.parseFunctionCallExpression();
    }

    return panicAt(`Unexpcted token: ${curToken}`);
  }

  // foo from 'foo'
  // { foo, bar } from 'baz'
  parseImportDeclaration() {
    const specifiers = [];
    while (this.peek(1).type === TokenType.Keyword) {
      specifiers.push(this.parseIdentifier());
      this.eatOrNot(TokenType.Comma);
    }

    this.eat(TokenType.Keyword, 'from');
    const source = this.parseStringLiteral();

    return new ImportDeclaration(specifiers, source);
  }

  parseVariableDeclaration(kind) {
    return new VariableDeclaration(kind, this.parseDeclarator());
  }

  parseDeclarator() {
    const id = this.parseIdentifier();
    this.eat(TokenType.Eq);
    const init = this.parseExpression();

    return new VariableDeclarator(id, init);
  }

  parseExpression() {
    // Binary Expression
    if (BinaryOps.has(this.peek(1).type)) {
      return this.parseBinaryExpression();
    }

    // Arrow Function
    // () => 1
    else if (
      this.peek().type === TokenType.LeftParenthesis ||
      this.peek(1).type === TokenType.Arrow
    ) {
      return this.parseArrowFunctionExpression();
    }

    // Function Call Expression
    // fn()
    if (
      this.peek().type === TokenType.Identifier &&
      this.peek(1).type === TokenType.LeftParenthesis
    ) {
      return this.parseFunctionCallExpression();
    }

    // Identifier
    else if (this.peek().type === TokenType.Identifier) {
      return this.parseIdentifier();
    }

    // Literal
    else if (this.peek().type === TokenType.StringLiteral) {
      return this.parseStringLiteral();
    } else if (this.peek().type === TokenType.NumberLiteral) {
      return this.parseNumberLiteral();
    }

    return panicAt('Unsupported expression type');
  }

  parseBinaryExpression() {
    let left = this.parsePrimaryExpression();
    while (BinaryOps.has(this.peek().type)) {
      const operator = this.eatAny(Array.from(BinaryOps));
      const right = this.parsePrimaryExpression();
      left = new BinaryExpression(left, operator, right);
    }

    return left;
  }

  parsePrimaryExpression() {
    if (this.peek(1).type === TokenType.Arrow) {
      return this.parseArrowFunctionExpression();
    } else if (this.peek().type === TokenType.Identifier) {
      return this.parseMemberExpression();
    } else if (this.peek().type === TokenType.NumberLiteral) {
      return this.parseNumberLiteral();
    } else if (this.peek().type === TokenType.StringLiteral) {
      return this.parseStringLiteral();
    } else if (this.peek().type === TokenType.LeftParenthesis) {
      return this.parseParenthesizedExpression();
    }

    return panicAt('Unsupported primary expression type');
  }

  parseParenthesizedExpression() {
    this.eat(TokenType.LeftParenthesis);
    const expression = this.parseExpression();
    this.eat(TokenType.RightParenthesis);

    return expression;
  }

  parseArrowFunctionExpression() {
    const params = this.parseParameters();
    this.eat(TokenType.Arrow);

    const body = [];
    if (this.peek().type === TokenType.LeftParenthesis) {
      this.eat(TokenType.LeftParenthesis);
      while (this.peek().type !== TokenType.RightParenthesis) {
        body.push(this.parseExpression());
      }
      this.eat(TokenType.RightParenthesis);
    } else {
      body.push(this.parseExpression());
    }

    return new ArrowFunctionExpression(null, params, body);
  }

  parseFunctionCallExpression() {
    const callee = this.parsePrimaryExpression();

    if (this.peek().type === TokenType.LeftParenthesis) {
      this.eat(TokenType.LeftParenthesis);
      const args = [];
      while (this.peek().type !== TokenType.RightParenthesis) {
        args.push(this.parseExpression());
        this.eatOrNot(TokenType.Comma);
      }
      this.eat(TokenType.RightParenthesis);

      return new FunctionCallExpression(callee, args);
    } else {
      return panicAt(
        'Expected a left parenthesis after the callee in a function call expression.'
      );
    }
  }

  parseParameters() {
    this.eatOrNot(TokenType.LeftParenthesis);
    const args = [];

    if (this.peek().type === TokenType.Identifier) {
      while (
        this.peek().type !== TokenType.RightParenthesis &&
        this.peek().type !== TokenType.Arrow
      ) {
        args.push(this.parseIdentifier());
        this.eatOrNot(TokenType.Comma);
      }
    }

    this.eatOrNot(TokenType.RightParenthesis);
    return args;
  }

  parseMemberExpression() {
    let object = this.parseIdentifier();
    while (this.peek().type === TokenType.Dot) {
      this.eat(TokenType.Dot);
      const property = this.parseIdentifier();
      object = new MemberExpression(object, property);
    }
    return object;
  }

  parseLiteral() {
    switch (this.peek().type) {
      case TokenType.NumberLiteral:
        return this.parseNumberLiteral();
      case TokenType.StringLiteral:
        return this.parseStringLiteral();

      default:
        return panicAt('Unsupported type');
    }
  }

  parseNumberLiteral() {
    return new NumberLiteral(this.eat(TokenType.NumberLiteral).value);
  }

  parseStringLiteral() {
    return new StringLiteral(this.eat(TokenType.StringLiteral).value);
  }

  parseIdentifier() {
    return new Identifier(this.eat(TokenType.Identifier).value);
  }
}

export const parse = tokens => {
  return new Parser(tokens).parse();
};
