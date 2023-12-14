// Fake code
const parseStat = () => {
  // const | import
  const token = eat();

  // 按照 Token 类型分发逻辑
  if (isConstOrLet(token)) {
    // const foo = 'foo'
    return parseDecla();
  }

  if (isImport(token)) {
    // import foo from 'foo'
    return parseImport();
  }
};

const parseDecla = () => {
  // 解析出一个 Ident 类型的节点作为 id
  const id = parseIdent();

  // 去除 '='
  eat();

  // 解析出一个 Expr 类型的节点作为 init
  const init = parseExpr();

  return DeclaNode(id, init);
};

const parseExpr = () => {
  const token = eat();

  // const a = 1;
  if (isNumberLit(token)) {
    return NumberLit();
  }

  // const a = add(1);
  if (isFunctionCall(token)) {
    return FunctionCall();
  }
};
