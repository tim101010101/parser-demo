// Fake code

class Visitable {
  constructor() {}

  accept(visitor) {
    visitor.visit(this);
  }
}

class Visitor {
  constructor() {}

  visit(root) {
    // 按照结构类型分发遍历逻辑
    if (root.type === 'Statement') {
      return this.visitStatement(root);
    }
    if (root.type === 'Expression') {
      return this.visitExpression(root);
    }
  }

  visitStatement(stat) {
    // 针对当前结构所需处理的字段递归访问
    return this.visit(stat.statProp);
  }
  visitExpression(expr) {
    return this.visit(expr.exprProp);
  }
}
