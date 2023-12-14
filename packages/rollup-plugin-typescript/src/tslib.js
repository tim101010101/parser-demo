// 导入文件系统模块中的 readFileSync 函数
const { readFileSync } = require('fs');

// 定义常量
const TSLIB = 'tslib';
const TSLIB_VIRTUAL = '\0tslib.js';
let tslibSource;
let tslibVersion;

try {
  // 尝试加载 tslib 包的 package.json 文件
  const tslibPackage = require('tslib/package.json');

  // 解析 tslib 包的模块路径
  const tslibPath = require.resolve('tslib/' + tslibPackage.module);

  // 读取 tslib 源代码并获取 tslib 版本
  tslibSource = readFileSync(tslibPath, 'utf8');
  tslibVersion = tslibPackage.version;
} catch (e) {
  // 如果加载失败，输出警告信息并抛出异常
  console.warn('rpt2: Error loading `tslib` helper library.');
  throw e;
}

// 导出相关常量和信息
module.exports = {
  TSLIB,
  TSLIB_VIRTUAL,
  tslibSource,
  tslibVersion,
};
