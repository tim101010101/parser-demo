import { readFile } from 'fs/promises';

/**
 * @returns {import('rollup').Plugin} A Rollup plugin.
 */
export const dropLoggerWhileLoad = () => {
  return {
    name: 'drop-logger-while-load',

    // 加载模块时执行
    load(id) {
      return new Promise(async (resolve, reject) => {
        try {
          // 读取文件内容
          const source = await readFile(id, 'utf-8');

          // 将源代码中的 logger 替换
          const code = source.replace(/console\.log\(.*\);/g, '');

          // 返回修改后的代码
          resolve(code);
        } catch (e) {
          reject(e);
        }
      });
    },
  };
};
