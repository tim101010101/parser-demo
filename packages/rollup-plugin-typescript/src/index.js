const {
  resolve,
  normalize: pathNormalize,
  relative,
  dirname,
} = require('path');
const { tsModule } = require('./tsproxy');
const { normalizePath: normalize } = require('@rollup/pluginutils');
const _ = require('lodash');

const { LanguageServiceHost } = require('./host');
const { TSLIB, TSLIB_VIRTUAL, tslibSource, tslibVersion } = require('./tslib');
const parseTsConfig = require('./parse-ts-config');

let parsedConfig;
let servicesHost;
let service;
const declarations = {};

// 插件配置选项
const pluginOptions = {
  check: false, // 关闭类型检查
  verbosity: 0, // 不输出日志
  clean: false,
  include: ['*.ts+(|x)', '**/*.ts+(|x)', '**/*.cts', '**/*.mts'],
  exclude: ['*.d.ts', '**/*.d.ts', '**/*.d.cts', '**/*.d.mts'],
  abortOnError: true,
  rollupCommonJSResolveHack: false,
  tsconfig: undefined,
  useTsconfigDeclarationDir: false,
  tsconfigOverride: {},
  transformers: [],
  tsconfigDefaults: {},
  objectHashIgnoreUnknownHack: false,
  cwd: process.cwd(),
  typescript: tsModule,
};

// 检查是否需要解析模块
const shouldResolve = id => {
  if (id.endsWith('.d.ts') || id.endsWith('.d.cts') || id.endsWith('.d.mts'))
    return false;
  return true;
};

// 添加声明信息到缓存
const addDeclaration = (id, result) => {
  if (!result.dts) return;
  const key = normalize(id);
  declarations[key] = { type: result.dts, map: result.dtsmap };
};

// 转换 TypeScript 编译输出
const convertEmitOutput = (output, references) => {
  const out = { code: '', references };

  output.outputFiles.forEach(e => {
    if (e.name.endsWith('.d.ts')) out.dts = e;
    else if (e.name.endsWith('.d.ts.map')) out.dtsmap = e;
    else if (e.name.endsWith('.map')) out.map = e.text;
    else out.code = e.text;
  });

  return out;
};

// 获取所有引用的文件
const getAllReferences = (importer, snapshot, options) => {
  if (!snapshot) return [];
  const info = tsModule.preProcessFile(
    snapshot.getText(0, snapshot.getLength()),
    true,
    true
  );

  return _.compact(
    info.referencedFiles.concat(info.importedFiles).map(reference => {
      const resolved = tsModule.nodeModuleNameResolver(
        reference.fileName,
        importer,
        options,
        tsModule.sys
      );
      return resolved.resolvedModule?.resolvedFileName;
    })
  );
};

const self = {
  name: 'rpt2',

  // 处理 Rollup 的配置选项
  options(config) {
    rollupOptions = { ...config };
    return config;
  },

  // 构建开始时的初始化
  // 主要是初始化 Typescript 的 LSP
  buildStart() {
    ({ parsedTsConfig: parsedConfig, fileName: tsConfigPath } =
      parseTsConfig(pluginOptions));

    console.info(`typescript version: ${tsModule.version}`);
    console.info(`tslib version: ${tslibVersion}`);
    console.info(`rollup version: ${this.meta.rollupVersion}`);

    servicesHost = new LanguageServiceHost(
      parsedConfig,
      pluginOptions.transformers,
      pluginOptions.cwd
    );
    service = tsModule.createLanguageService(servicesHost);
    servicesHost.setLanguageService(service);
  },

  // 解析模块 ID
  resolveId(importee, importer) {
    if (importee === TSLIB) return TSLIB_VIRTUAL;

    if (!importer) return;

    importer = normalize(importer);

    const result = tsModule.nodeModuleNameResolver(
      importee,
      importer,
      parsedConfig.options,
      tsModule.sys
    );
    const resolved = result.resolvedModule?.resolvedFileName;

    if (!resolved) return;

    if (!shouldResolve(resolved)) return;

    return pathNormalize(resolved);
  },

  // 加载模块
  load(id) {
    if (id === TSLIB_VIRTUAL) return tslibSource;
    return null;
  },

  // 编译 TypeScript 代码
  async transform(code, id) {
    const snapshot = servicesHost.setSnapshot(id, code);

    // 获取 TypeScript 编译结果
    const output = service.getEmitOutput(id);

    const references = getAllReferences(id, snapshot, parsedConfig.options);
    const result = convertEmitOutput(output, references);

    addDeclaration(id, result);

    if (parsedConfig.options.emitDeclarationOnly) {
      return undefined;
    }

    // 构建 Rollup 转换结果
    const transformResult = {
      code: result.code,
      map: { mappings: '' },
    };

    if (result.map) {
      transformResult.map = JSON.parse(result.map);
    }

    return transformResult;
  },

  // 构建结束时的处理
  buildEnd(err) {
    generateRound = 0;

    if (err) throw err;
  },

  // 生成 Rollup 输出文件时的处理
  generateBundle(output) {
    console.info(`生成目标 ${generateRound + 1}`);
    generateRound++;

    if (!parsedConfig.options.declaration) return;

    parsedConfig.fileNames.forEach(name => {
      const key = normalize(name);
      if (key in declarations) return;

      const out = convertEmitOutput(service.getEmitOutput(key, true));
      addDeclaration(key, out);
    });

    // 生成声明文件
    const emitDeclaration = (extension, entry) => {
      if (!entry) return;

      let fileName = entry.name;
      if (fileName.includes('?')) fileName = fileName.split('?', 1) + extension;

      if (pluginOptions.useTsconfigDeclarationDir) {
        tsModule.sys.writeFile(fileName, entry.text, entry.writeByteOrderMark);
        return;
      }

      let entryText = entry.text;
      const cachePlaceholder = '/placeholder'; // 不再使用 cacheRoot

      if (extension === '.d.ts.map' && (output?.file || output?.dir)) {
        const declarationDir = output.file ? dirname(output.file) : output.dir;
        const parsedText = JSON.parse(entryText);
        parsedText.sources = parsedText.sources.map(source => {
          const absolutePath = resolve(cachePlaceholder, source);
          return normalize(relative(declarationDir, absolutePath));
        });
        entryText = JSON.stringify(parsedText);
      }

      const relativePath = normalize(relative(cachePlaceholder, fileName));
      this.emitFile({
        type: 'asset',
        source: entryText,
        fileName: relativePath,
      });
    };

    Object.keys(declarations).forEach(key => {
      const { type, map } = declarations[key];
      emitDeclaration('.d.ts', type);
      emitDeclaration('.d.ts.map', map);
    });
  },
};

module.exports = self;
