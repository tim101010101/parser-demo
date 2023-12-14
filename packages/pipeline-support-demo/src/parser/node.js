import { NodeType } from './nodeType.js';
import { Visitable } from '../visitor/index.js';

export class ASTNode extends Visitable {
  constructor(type) {
    super();
    this.type = type;
  }
}

export class Program extends ASTNode {
  constructor(body) {
    super(NodeType.Program);
    this.body = body;
  }
}

export class ImportDeclaration extends ASTNode {
  constructor(specifiers, source) {
    super(NodeType.ImportDeclaration);
    this.specifiers = specifiers;
    this.source = source;
  }
}

export class VariableDeclaration extends ASTNode {
  constructor(kind, declaration) {
    super(NodeType.VariableDeclaration);
    this.kind = kind;
    this.declaration = declaration;
  }
}

export class VariableDeclarator extends ASTNode {
  constructor(id, init) {
    super(NodeType.VariableDeclarator);
    this.id = id;
    this.init = init;
  }
}

// 1 + 1
export class BinaryExpression extends ASTNode {
  constructor(left, op, right) {
    super(NodeType.BinaryExpression);
    this.left = left;
    this.op = op;
    this.right = right;
  }
}

export class ArrowFunctionExpression extends ASTNode {
  constructor(id, params, body) {
    super(NodeType.ArrowFunctionExpression);
    this.id = id;
    this.params = params;
    this.body = body;
  }
}

export class FunctionCallExpression extends ASTNode {
  constructor(callee, args) {
    super(NodeType.FunctionCallExpression);
    this.callee = callee;
    this.args = args;
  }
}

export class MemberExpression extends ASTNode {
  constructor(object, property) {
    super(NodeType.MemberExpression);
    this.object = object;
    this.property = property;
  }
}

export class NumberLiteral extends ASTNode {
  constructor(value) {
    super(NodeType.NumberLiteral);
    this.value = value;
  }
}

export class StringLiteral extends ASTNode {
  constructor(value) {
    super(NodeType.StringLiteral);
    this.value = value;
    this.raw = `"${value}"`;
  }
}

export class Identifier extends ASTNode {
  constructor(id) {
    super(NodeType.Identifier);
    this.id = id;
  }
}
