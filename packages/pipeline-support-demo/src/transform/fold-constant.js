import { TokenType } from '../lexer/tokenType.js';
import { NodeType, NumberLiteral } from '../parser/index.js';
import { panicAt } from '../utils/index.js';
import { Visitor } from '../visitor/index.js';

class FoldConstant extends Visitor {
  constructor() {
    super();
  }

  visitBinaryExpression(expr) {
    this.replaceCurrentSubtree(tryEvalBinaryExpr(expr));
  }
}

const simpleOps = new Set([
  TokenType.Plus,
  TokenType.Sub,
  TokenType.Mul,
  TokenType.Div,
]);

const evalExpr = expr => {
  switch (expr.type) {
    case NodeType.BinaryExpression:
      return tryEvalBinaryExpr(expr);

    case NodeType.NumberLiteral:
      return expr;

    default:
      return expr;
  }
};

const tryEvalBinaryExpr = expr => {
  const { left, op, right } = expr;

  const leftValue = evalExpr(left);
  const rightValue = evalExpr(right);

  if (
    leftValue.type === NodeType.NumberLiteral &&
    rightValue.type === NodeType.NumberLiteral &&
    simpleOps.has(op.type)
  ) {
    const leftRawValue = Number(leftValue.value);
    const rightRawValue = Number(rightValue.value);

    switch (op.type) {
      case TokenType.Plus:
        return new NumberLiteral(leftRawValue + rightRawValue);
      case TokenType.Sub:
        return new NumberLiteral(leftRawValue - rightRawValue);
      case TokenType.Mul:
        return new NumberLiteral(leftRawValue * rightRawValue);
      case TokenType.Div:
        if (rightRawValue === 0) {
          return panicAt('Error');
        }
        return new NumberLiteral(leftRawValue / rightRawValue);

      default:
        return panicAt(`Unsupported op: ${op.type}`);
    }
  }

  return expr;
};

export const foldConstant = ast => {
  const transformer = new FoldConstant();
  transformer.visit(ast);
  return ast;
};
