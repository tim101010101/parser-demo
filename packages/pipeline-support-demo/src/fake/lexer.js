// Fake code
const tokenize = () => {
  // 按照当前字符类型分发处理逻辑
  if (isDigit(char)) {
    // 遇到终止条件之前累加字符
    let num = '';
    while (isDigit(curChar)) {
      num += curChar;
    }

    // 构造并返回 Token
    return NumberToken(Number(num));
  }

  if (isAlpha(char)) {
    let ident = '';
    while (isAlpha(curChar)) {
      ident += curChar;
    }

    return IdentToken(ident);
  }

  // ...
};
