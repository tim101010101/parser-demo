import { Visitor } from '../visitor/index.js';

class Translator extends Visitor {
  constructor() {
    super();
    this.code = '';
  }

  write(code, withWhitespace = true) {
    this.code += `${code}${withWhitespace ? ' ' : ''}`;
  }

  ws() {
    this.write(' ', false);
  }

  newline() {
    this.write('\n', false);
  }

  handleListWithSeparator(list, handler, separator) {
    list.forEach((item, i) => {
      handler.call(this, item);

      if (i < list.length - 1) {
        this.write(separator, false);
      }
    });
  }

  visitStatement(stat) {
    this.visitDeclaration(stat);
    this.write(';', false);
    this.newline();
  }

  visitImportDeclaration(stat) {
    const { specifiers, source } = stat;

    this.write('import');

    this.handleListWithSeparator(specifiers, this.visitExpression, ', ');
    this.ws();

    this.write('from');

    this.visitExpression(source);
  }

  visitVariableDeclaration(stat) {
    const { kind, declaration } = stat;

    this.write(kind);

    this.visitVariableDeclarator(declaration);
  }

  visitVariableDeclarator(declarator) {
    const { id, init } = declarator;
    this.visitIdentifier(id);
    this.ws();

    this.write('=');

    this.visitExpression(init);
  }

  visitBinaryExpression(expr) {
    const { left, op, right } = expr;
    this.visitExpression(left);
    this.ws();

    this.visitOperator(op);
    this.ws();

    this.visitExpression(right);
  }

  visitArrowFunctionExpression(expr) {
    const { params, body } = expr;

    if (params.length === 0) {
      this.write('()', false);
    } else if (params.length === 1) {
      this.visitIdentifier(params[0]);
    } else {
      this.write('(', false);
      this.handleListWithSeparator(params, this.visitIdentifier, ', ');
      this.write(')', false);
    }
    this.ws();
    this.write('=>');

    if (body.length === 0) {
      this.write('{}', false);
    } else if (body.length === 1) {
      this.visitDeclaration(body[0]);
    } else {
      this.write('{', false);
      this.newline();
      this.handleListWithSeparator(body, this.visitStatement, '');
      this.write('}', false);
    }
  }

  visitFunctionCallExpression(expr) {
    const { callee, args } = expr;

    this.visitExpression(callee);
    this.write('(', false);
    this.handleListWithSeparator(args, this.visitExpression, ', ');
    this.write(')', false);
  }

  visitMemberExpression(expr) {
    const { object, property } = expr;

    this.visitExpression(object);
    this.write('.', false);
    this.visitExpression(property);
  }

  visitNumberLiteral(lit) {
    const { value } = lit;
    this.write(value, false);
  }

  visitStringLiteral(lit) {
    const { raw } = lit;
    this.write(raw, false);
  }

  visitIdentifier(iden) {
    this.write(iden.id, false);
  }

  visitOperator(op) {
    this.write(op.value, false);
  }
}

export const codegen = ast => {
  const translator = new Translator();
  translator.visit(ast);
  return translator.code;
};
