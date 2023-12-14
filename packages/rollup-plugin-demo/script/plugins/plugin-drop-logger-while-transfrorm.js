import MagicString from 'magic-string';

/**
 * @returns {import('rollup').Plugin} A Rollup plugin.
 */
export const dropLoggerWhileTransform = () => {
  return {
    name: 'drop-logger-while-transform',

    transform(source) {
      // 将源代码中的 logger 替换
      const code = source.replace(/console\.log\(.*\);/g, '');

      return {
        code,
      };
    },
  };
};

/**
 * @returns {import('rollup').Plugin} A Rollup plugin.
 */
export const dropLoggerWhileTransformWithParse = () => {
  return {
    name: 'drop-logger-while-transform-with-parse',

    transform(source) {
      const ms = new MagicString(source);

      // 解析生成 AST
      const ast = this.parse(source);

      // 遍历 AST
      ast.body.forEach(node => {
        // 若发现 console.log 语句，则直接从 MagicString 中删除
        if (
          node.type === 'ExpressionStatement' &&
          node.expression.type === 'CallExpression' &&
          node.expression.callee.type === 'MemberExpression' &&
          node.expression.callee.object.name === 'console' &&
          node.expression.callee.property.name === 'log'
        ) {
          ms.remove(node.start, node.end);
        }
      });

      // 生成目标代码
      const code = ms.toString();

      return {
        code,
      };
    },
  };
};
