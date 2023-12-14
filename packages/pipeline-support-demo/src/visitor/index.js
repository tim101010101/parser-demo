import { NodeType } from '../parser/nodeType.js';
import { panicAt } from '../utils/index.js';

export class Visitable {
  constructor() {}

  accept(visitor) {
    visitor.visit(this);
  }
}

export class Visitor {
  constructor() {
    this.currentParent = null;
    this.currentKey = null;
    this.currentIndex = 0;
    this.program = null;
    this.isArray = false;
    this.arrayIdx = 0;
  }

  setCurrentLocation(parent, key, isArray = false) {
    this.currentParent = parent;
    this.currentKey = key;
    this.isArray = isArray;
  }

  visit(root) {
    if (!root) return;

    switch (root.type) {
      case NodeType.Program:
        return this.visitProgram(root);

      case NodeType.ImportDeclaration:
      case NodeType.VariableDeclaration:
        return this.visitDeclaration(root);

      case NodeType.BinaryExpression:
      case NodeType.ArrowFunctionExpression:
      case NodeType.FunctionCallExpression:
      case NodeType.MemberExpression:
        return this.visitExpression(root);

      case NodeType.NumberLiteral:
      case NodeType.StringLiteral:
        return this.visitLiteral(root);

      case NodeType.VariableDeclarator:
        return this.visitVariableDeclarator(root);

      case NodeType.Identifier:
        return this.visitIdentifier(root);

      default:
        return panicAt(`Unsupported type: ${root.type}`);
    }
  }

  visitProgram(program) {
    this.setCurrentLocation(program, 'body', true);
    this.program = program;

    for (; this.currentIndex < program.body.length; this.currentIndex++) {
      this.arrayIdx = this.currentIndex;
      const stat = program.body[this.currentIndex];
      this.visitStatement(stat);
    }
  }

  visitStatement(stat) {
    this.visit(stat);
  }
  visitDeclaration(declarationStat) {
    switch (declarationStat.type) {
      case NodeType.ImportDeclaration:
        this.visitImportDeclaration(declarationStat);
        break;
      case NodeType.VariableDeclaration:
        this.visitVariableDeclaration(declarationStat);
        break;

      default:
        return this.visitExpression(declarationStat);
    }
  }
  visitImportDeclaration(importDeclarationStat) {
    const { specifiers, source } = importDeclarationStat;

    this.setCurrentLocation(importDeclarationStat, 'specifiers', true);
    specifiers.forEach((specifier, i) => {
      this.arrayIdx = i;
      this.visit(specifier);
    });

    this.setCurrentLocation(importDeclarationStat, 'source');
    this.visit(source);
  }
  visitVariableDeclaration(variableDeclarationStat) {
    const { declaration } = variableDeclarationStat;
    this.setCurrentLocation(variableDeclarationStat, 'declaration');
    this.visit(declaration);
  }
  visitVariableDeclarator(variableDeclarator) {
    const { id, init } = variableDeclarator;

    this.setCurrentLocation(variableDeclarator, 'id');
    this.visit(id);

    this.setCurrentLocation(variableDeclarator, 'init');
    this.visit(init);
  }

  visitExpression(expr) {
    switch (expr.type) {
      case NodeType.BinaryExpression:
        this.visitBinaryExpression(expr);
        break;
      case NodeType.ArrowFunctionExpression:
        this.visitArrowFunctionExpression(expr);
        break;
      case NodeType.FunctionCallExpression:
        this.visitFunctionCallExpression(expr);
        break;
      case NodeType.MemberExpression:
        this.visitMemberExpression(expr);
        break;

      case NodeType.NumberLiteral:
        this.visitNumberLiteral(expr);
        break;
      case NodeType.StringLiteral:
        this.visitStringLiteral(expr);
        break;

      case NodeType.Identifier:
        this.visitIdentifier(expr);
        break;

      default:
        return panicAt(`Unsupported type: ${expr.type}`);
    }
  }
  visitBinaryExpression(binaryExpr) {
    const { left, op, right } = binaryExpr;

    this.setCurrentLocation(binaryExpr, 'left');
    this.visit(left);

    this.setCurrentLocation(binaryExpr, 'op');
    this.visitOperator(op);

    this.setCurrentLocation(binaryExpr, 'right');
    this.visit(right);
  }
  visitArrowFunctionExpression(arrowFunctionExpr) {
    const { params, body } = arrowFunctionExpr;

    this.setCurrentLocation(arrowFunctionExpr, 'params', true);
    params.forEach((param, i) => {
      this.arrayIdx = i;
      this.visit(param);
    });

    this.setCurrentLocation(arrowFunctionExpr, 'body', true);
    body.forEach((stat, i) => {
      this.arrayIdx = i;
      this.visit(stat);
    });
  }
  visitFunctionCallExpression(functionCallExpr) {
    const { callee, args } = functionCallExpr;

    this.setCurrentLocation(functionCallExpr, 'callee');
    this.visit(callee);

    this.setCurrentLocation(functionCallExpr, 'args', true);
    args.forEach((arg, i) => {
      this.arrayIdx = i;
      this.visit(arg);
    });
  }
  visitMemberExpression(memberExpr) {
    const { object, property } = memberExpr;

    this.setCurrentLocation(memberExpr, 'object');
    this.visit(object);

    this.setCurrentLocation(memberExpr, 'property');
    this.visit(property);
  }

  visitLiteral(literal) {
    switch (literal.type) {
      case NodeType.NumberLiteral:
        this.visitNumberLiteral(literal);
        break;
      case NodeType.StringLiteral:
        this.visitStringLiteral(literal);
        break;

      default:
        break;
    }
  }
  visitNumberLiteral(numberLiteral) {
    // To be implemented
  }
  visitStringLiteral(stringLiteral) {
    // To be implemented
  }

  visitIdentifier(iden) {
    // To be implemented
  }

  visitOperator(op) {
    // TO Be implemented
  }

  insertStat(stat, isPrev = true) {
    if (!this.program) return;

    this.program.body.splice(
      isPrev ? this.currentIndex : this.currentIndex + 1,
      0,
      stat
    );
    if (isPrev) {
      this.currentIndex++;
    }
  }

  replaceCurrentSubtree(newSubtree) {
    const parent = this.currentParent;
    const key = this.currentKey;

    if (!parent || typeof parent !== 'object') {
      return panicAt('Invalid parent object');
    } else if (!key || typeof key !== 'string') {
      return panicAt('Invalid key');
    } else if (!newSubtree || typeof newSubtree !== 'object') {
      return panicAt('Invalid newSubtree object');
    } else if (!Reflect.has(parent, key)) {
      return panicAt(`Key "${key}" not found in parent`);
    }

    if (this.isArray) {
      parent[key][this.arrayIdx] = newSubtree;
    } else {
      parent[key] = newSubtree;
    }
  }
}
