/**
 * @returns {import('rollup').Plugin} A Rollup plugin.
 */
export const dropLoggerWhileRenderChunk = () => {
  return {
    name: 'drop-logger-while-render-chunk',

    // 解析 chunk 时调用
    renderChunk(source) {
      const code = source.replace(/console\.log\(.*\);/g, '');
      return {
        code,
      };
    },
  };
};
