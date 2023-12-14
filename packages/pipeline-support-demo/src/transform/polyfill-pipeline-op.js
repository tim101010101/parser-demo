import { TokenType } from '../lexer/tokenType.js';
import {
  NodeType,
  FunctionCallExpression,
  Identifier,
  VariableDeclarator,
  VariableDeclaration,
} from '../parser/index.js';
import { Visitor } from '../visitor/index.js';

class Polyfill extends Visitor {
  constructor() {
    super();
  }

  visitBinaryExpression(expr) {
    if (expr.op.type !== TokenType.Pipeline) {
      return super.visitBinaryExpression(expr);
    }

    let _id = 0;
    const getId = () => `$${_id++ % Number.MAX_VALUE}`; // Prevent overflow...

    // Convert binary expression with pipeline operator into function calls.
    //
    // In essence, it is an infix expression to a prefix expression.
    const newSubTree = transformPipelineExpr(expr, this, getId);

    // Replace the processed AST with the existing sub tree.
    this.replaceCurrentSubtree(newSubTree);
  }
}

const transformPipelineExpr = (expr, visitor, getId) => {
  // The arrow function expression can only exist as a right value
  //
  // Convert the arrow function expression first,
  // and then perform the polyfill operation
  //
  // before:
  //   1 |> x => 1 + x
  // after:
  //  const $0 = x => 1 + x
  //  1 |> $0
  if (expr.right.type === NodeType.ArrowFunctionExpression) {
    const id = new Identifier(getId());
    const declaration = new VariableDeclaration(
      'const',
      new VariableDeclarator(id, expr.right)
    );
    visitor.insertStat(declaration);
    expr.right = id;
  }

  const { left, right } = expr;

  // According to operator precedence, nested expressions
  // can only be used as left values.
  //
  // Therefore, it should be processed while backtracking.
  //
  // before:
  //   1 |> addOne |> addtwo
  // after:
  //   addTwo(addOne(1))
  if (
    left.type === NodeType.BinaryExpression &&
    left.op.type === TokenType.Pipeline
  ) {
    const nestedFunctionCallExpr = transformPipelineExpr(left, visitor, getId);
    return new FunctionCallExpression(right, [nestedFunctionCallExpr]);
  }

  return new FunctionCallExpression(right, [left]);
};

export const polyfillPipeline = ast => {
  const transformer = new Polyfill();
  transformer.visit(ast);
  return ast;
};
