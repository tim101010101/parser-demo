import { dirname } from 'path';
import { tsModule } from './tsproxy';

const parseTsConfig = pluginOptions => {
  const fileName = tsModule.findConfigFile(
    pluginOptions.cwd,
    tsModule.sys.fileExists,
    pluginOptions.tsconfig
  );

  if (pluginOptions.tsconfig !== undefined && !fileName) {
    throw new Error(`failed to open '${pluginOptions.tsconfig}`);
  }

  let loadedConfig = {};
  let baseDir = pluginOptions.cwd;
  let configFileName;

  if (fileName) {
    const text = tsModule.sys.readFile(fileName);
    const result = tsModule.parseConfigFileTextToJson(fileName, text);

    if (result.error !== undefined) {
      throw new Error(`failed to parse '${fileName}'`);
    }

    loadedConfig = result.config;
    baseDir = dirname(fileName);
    configFileName = fileName;
  }

  const mergedConfig = {
    ...pluginOptions.tsconfigDefaults,
    ...loadedConfig,
    ...pluginOptions.tsconfigOverride,
  };

  const parsedTsConfig = tsModule.parseJsonConfigFileContent(
    mergedConfig,
    tsModule.sys,
    baseDir,
    mergedConfig,
    configFileName
  );

  const module = parsedTsConfig.options.module;
  if (
    ![
      tsModule.ModuleKind.ES2015,
      tsModule.ModuleKind.ES2020,
      tsModule.ModuleKind.ES2022,
      tsModule.ModuleKind.ESNext,
    ].includes(module)
  ) {
    throw new Error(
      `Incompatible tsconfig option. Module resolves to '${tsModule.ModuleKind[module]}'. This is incompatible with Rollup, please use 'module: "ES2015"', 'module: "ES2020"', 'module: "ES2022"', or 'module: "ESNext"'.`
    );
  }

  return { parsedTsConfig, fileName };
};

module.exports = parseTsConfig;
