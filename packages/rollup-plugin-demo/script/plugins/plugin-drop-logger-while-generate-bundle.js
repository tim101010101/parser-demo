/**
 * @returns {import('rollup').Plugin} A Rollup plugin.
 */
export const dropLoggerWhileGenerateBundle = () => {
  return {
    name: 'drop-logger-while-generate-bundle',

    // 所有的 chunk 构建完成后执行
    generateBundle(_, bundle) {
      const reg = /console\.log\(.*\);/g;

      // 遍历 bundle 下所有输出
      Object.entries(bundle)
        // 将 asset 类型的输出过滤掉
        .filter(([_, output]) => output.type === 'chunk')
        // 去除 chunk 中的 logger
        .forEach(([id, chunk]) => {
          const source = chunk.code;

          // 发现 logger 则去除
          if (reg.test(source)) {
            bundle[id].code = source.replace(reg, '');
          }
        });
    },
  };
};
