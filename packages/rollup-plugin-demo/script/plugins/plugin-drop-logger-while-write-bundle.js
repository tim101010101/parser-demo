import { readFileSync, writeFileSync } from 'fs';

/**
 * @returns {import('rollup').Plugin} A Rollup plugin.
 */
export const dropLoggerWhileWriteBundle = () => {
  return {
    name: 'drop-logger-while-write-bundle',

    // 写入 bundle 时执行
    writeBundle({ file }, bundle) {
      Object.entries(bundle)
        // 过滤不同类型的输出，不处理 asset，只处理 chunk
        .filter(([_, output]) => output.type === 'chunk')
        .forEach(() => {
          const code =
            // 读取文件内容
            readFileSync(file, 'utf-8')
              // 去除 console.log 语句
              .replace(/console\.log\(.*\);/g, '');

          // 重新写入文件
          writeFileSync(file, code, 'utf-8');
        });
    },
  };
};
