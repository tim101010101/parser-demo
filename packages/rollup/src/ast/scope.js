// 作用域
class Scope {
  parent;
  depth;
  names;
  isBlockScope;

  constructor(options = {}) {
    this.parent = options.parent || null;
    this.depth = this.parent ? this.parent.depth + 1 : 0;
    this.names = options.params || [];
    this.isBlockScope = !!options.block;
  }

  add(name, isBlockDeclaration) {
    // 定义语句
    if (!isBlockDeclaration && this.isBlockScope) {
      this.parent.add(name, isBlockDeclaration);
    } else {
      this.names.push(name);
    }
  }

  contains(name) {
    return !!this.findDefiningScope(name);
  }

  findDefiningScope(name) {
    if (this.names.includes(name)) {
      return this;
    }

    if (this.parent) {
      return this.parent.findDefiningScope(name);
    }

    return null;
  }
}

module.exports = Scope;
