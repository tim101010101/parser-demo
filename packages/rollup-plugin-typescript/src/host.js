// 导入依赖模块
const { normalizePath: normalize } = require('@rollup/pluginutils');
const { tsModule } = require('./tsproxy');

// LanguageServiceHost 类
class LanguageServiceHost {
  // 构造函数，接收解析后的 TypeScript 配置、转换器和当前工作目录
  constructor(parsedConfig, transformers, cwd) {
    this.parsedConfig = parsedConfig; // 解析后的 TypeScript 配置
    this.transformers = transformers; // 转换器
    this.cwd = cwd; // 当前工作目录
    this.snapshots = {}; // 脚本快照集合
    this.versions = {}; // 脚本版本号集合
    this.fileNames = new Set(parsedConfig.fileNames); // 脚本文件名集合
  }

  // 重置脚本快照和版本号
  reset() {
    this.snapshots = {};
    this.versions = {};
  }

  // 设置 LanguageService 实例
  setLanguageService(service) {
    this.service = service;
  }

  // 设置脚本快照
  setSnapshot(fileName, source) {
    fileName = normalize(fileName);

    // 使用 TypeScript 提供的 ScriptSnapshot.fromString 方法创建脚本快照
    const snapshot = tsModule.ScriptSnapshot.fromString(source);

    // 更新脚本快照和版本号
    this.snapshots[fileName] = snapshot;
    this.versions[fileName] = (this.versions[fileName] || 0) + 1;

    // 将文件名添加到集合中
    this.fileNames.add(fileName);

    // 返回脚本快照
    return snapshot;
  }

  // 获取脚本快照
  getScriptSnapshot(fileName) {
    fileName = normalize(fileName);

    // 如果脚本快照已存在，则直接返回
    if (fileName in this.snapshots) return this.snapshots[fileName];

    // 否则，尝试从文件中读取源代码并设置脚本快照
    const source = tsModule.sys.readFile(fileName);
    if (source) return this.setSnapshot(fileName, source);

    // 如果读取失败，返回 undefined
    return undefined;
  }

  // 获取所有脚本文件名的数组
  getScriptFileNames = () => Array.from(this.fileNames.values());

  // 获取脚本版本号
  getScriptVersion(fileName) {
    fileName = normalize(fileName);

    // 返回脚本版本号，如果不存在则默认为 0
    return (this.versions[fileName] || 0).toString();
  }

  // 获取自定义转换器
  getCustomTransformers() {
    // 如果 LanguageService 未定义或转换器为空，返回 undefined
    if (
      this.service === undefined ||
      this.transformers === undefined ||
      this.transformers.length === 0
    )
      return undefined;

    // 初始化转换器对象
    const transformer = {
      before: [],
      after: [],
      afterDeclarations: [],
    };

    // 遍历所有转换器工厂并应用到相应阶段
    for (const creator of this.transformers) {
      const factory = creator(this.service);
      if (factory.before)
        transformer.before = transformer.before.concat(factory.before);
      if (factory.after)
        transformer.after = transformer.after.concat(factory.after);
      if (factory.afterDeclarations)
        transformer.afterDeclarations = transformer.afterDeclarations.concat(
          factory.afterDeclarations
        );
    }

    // 返回转换器对象
    return transformer;
  }

  // 获取编译设置
  getCompilationSettings = () => this.parsedConfig.options;

  // 获取类型根版本
  getTypeRootsVersion = () => 0;

  // 获取当前工作目录
  getCurrentDirectory = () => this.cwd;

  // 是否使用大小写敏感的文件名
  useCaseSensitiveFileNames = () => tsModule.sys.useCaseSensitiveFileNames;

  // 获取默认库文件名
  getDefaultLibFileName = tsModule.getDefaultLibFilePath;

  // 一些 TypeScript sys 接口的实现，使用 tsModule.sys 提供的系统操作方法
  readDirectory = tsModule.sys.readDirectory;
  readFile = tsModule.sys.readFile;
  fileExists = tsModule.sys.fileExists;
  directoryExists = tsModule.sys.directoryExists;
  getDirectories = tsModule.sys.getDirectories;
  realpath = tsModule.sys.realpath;

  trace = console.log;
}

module.exports = LanguageServiceHost;
