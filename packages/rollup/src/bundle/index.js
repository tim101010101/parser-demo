const path = require('path');
const fs = require('fs');
const MagicString = require('magic-string');
const Module = require('../module/module');
const ExternalModule = require('../module/external-module');
const finalisers = require('../finalisers');
const replaceIdentifiers = require('../utils/replaceIdentifiers');

class Bundle {
  entryPath; // 入口路径
  base; // 入口文件目录
  entryModule; // 入口模块
  modules; // 已读取的模块

  statement; // 需要被生成代码的 AST 节点

  externalModules; // 外部模块

  internalNamespaceModules; // 内部命名模块, import * as test from './foo' 时用到

  constructor(options = {}) {
    // 补充 .js 后缀
    this.entryPath = path.resolve(options.entry.replace(/\.js$/, '') + '.js');
    this.base = path.dirname(this.entryPath);
    this.entryModule = null;
    this.modules = {};
    this.statements = [];
    this.externalModules = [];
    this.internalNamespaceModules = [];
  }

  build() {
    // 导入入口模块
    const entryModule = this.fetchModule(this.entryPath);
    this.entryModule = entryModule;

    // 展开入口模块的所有语句
    // 其中会递归导入所依赖的模块
    const statements = this.entryModule.expandAllStatements(true);
    this.statements = statements;

    // 解决命名冲突
    this.deconflict();
  }

  reset() {
    this.base = path.dirname(this.entryPath);
    this.entryModule = null;
    this.modules = {};
    this.statements = [];
    this.externalModules = [];
    this.internalNamespaceModules = [];
  }

  watch() {
    return fs.watch(this.base, {
      recursive: true,
    });
  }

  // importee 被调用模块文件
  // importer 调用模块文件
  fetchModule(importee, importer) {
    // 如果已经读取就直接返回
    if (this.modules[importee]) {
      return this.modules[importee];
    }

    // 子模块路径
    let route;
    // 入口文件没有 importer
    if (!importer) {
      route = importee;
    } else {
      // 绝对路径
      if (path.isAbsolute(importee)) {
        route = importee;
      }

      // 相对路径
      else if (importee[0] === '.') {
        // 处理成绝对路径
        route = path.resolve(
          path.dirname(importer),
          importee.replace(/\.js$/, '') + '.js'
        );
      }
    }

    // 找到了路径，认为是内部模块
    if (route) {
      const code = fs.readFileSync(route, 'utf-8');
      // 构建子模块
      const module = new Module({
        code,
        path: route,
        bundle: this,
      });

      this.modules[route] = module;
      return module;
    }

    // 没有找到路径则是外部模块
    else {
      // 构建外部模块
      const module = new ExternalModule(importee);
      this.externalModules.push(module);
      this.modules[importee] = module;
      return module;
    }
  }

  generate(options = {}) {
    let magicString = new MagicString.Bundle({ separator: '' });
    let previousMargin = 0;

    // 1. 生成新的标识符名字
    // 2. 修改导出语句
    this.statements.forEach(statement => {
      // 需要修改的标识符
      const replacements = {};

      // 所有需要被处理的标识符，包括该语句相关的依赖语句以及定义语句
      const identifierKeys = Object.keys(statement._dependsOn).concat(
        Object.keys(statement._defines)
      );
      // 记录修改方式
      identifierKeys.forEach(name => {
        const canonicalName = statement._module.getCanonicalName(name);
        if (name !== canonicalName) {
          replacements[name] = canonicalName;
        }
      });

      // 源代码
      const source = statement._source.clone().trim();

      // 修改导出语句的 `export` 关键字
      if (/^Export/.test(statement.type)) {
        // 跳过 `export { foo, bar }` 语句
        if (
          statement.type === 'ExportNamedDeclaration' &&
          statement.specifiers.length
        ) {
          return;
        }

        // 移除 `export let foo = 1` 中的 `export `
        if (
          statement.type === 'ExportNamedDeclaration' &&
          statement.declaration.type === 'VariableDeclaration'
        ) {
          source.remove(statement.start, statement.declaration.start);
        }

        // 移除 `export class Foo {...}` 中的 `export `
        else if (statement.declaration.id) {
          source.remove(statement.start, statement.declaration.start);
        }

        // 将 `export default foo = 1` 改为 `var defaultValue = foo = 1`
        else if (statement.type === 'ExportDefaultDeclaration') {
          const module = statement._module;
          const canonicalName = module.getCanonicalName('default');

          if (
            statement.declaration.type === 'Identifier' &&
            canonicalName ===
              module.getCanonicalName(statement.declaration.name)
          ) {
            return;
          }

          source.overwrite(
            statement.start,
            statement.declaration.start,
            `var ${canonicalName} = `
          );
        }

        // 无法处理的导出语句
        else {
          throw new Error('Unhandled export');
        }
      }

      // `import { resolve } from path`
      // 将语句中所有 `resolve` 改为 path.resolve
      replaceIdentifiers(statement, source, replacements);

      // 生成空行
      const margin = Math.max(statement._margin[0], previousMargin);
      const newLines = new Array(margin).join('\n');

      // 生成该语句本身
      magicString.addSource({
        content: source,
        separator: newLines,
      });

      previousMargin = statement._margin[1];
    });

    // 针对命名空间导出语句 `import * as foo from './foo'`
    //
    // 假设 foo 文件有默认导出的函数和 bar() 函数，生成的代码如下
    // var foo = {
    // 	 get default() { return foo__default },
    // 	 get bar() { return bar }
    // }
    const indentString = magicString.getIndentString();
    const namespaceBlock = this.internalNamespaceModules
      .map(module => {
        const exportKeys = Object.keys(module.exports);

        return (
          `var ${module.getCanonicalName('*')} = {\n` +
          exportKeys
            .map(
              key =>
                `${indentString}get ${key}() { return ${module.getCanonicalName(
                  key
                )} }`
            )
            .join(',\n') +
          `\n}\n\n`
        );
      })
      .join('');

    magicString.prepend(namespaceBlock);

    // 导出模式
    //  'default' / 'named' / 'none'
    const exportMode = this.getExportMode(options.exports);
    const finalise = finalisers[options.format || 'cjs'];
    magicString = finalise(this, magicString.trim(), exportMode, options);

    return { code: magicString.toString() };
  }

  getExportMode(exportMode) {
    // 获取入口模块的导出关键字
    const exportKeys = Object.keys(this.entryModule.exports);

    if (!exportMode || exportMode === 'auto') {
      // 没有导出模块
      if (exportKeys.length === 0) {
        exportMode = 'none';
      }

      // 只有一个导出模块，并且是 default
      else if (exportKeys.length === 1 && exportKeys[0] === 'default') {
        exportMode = 'default';
      }

      // 否则都是命名导出
      else {
        exportMode = 'named';
      }
    }

    return exportMode;
  }

  deconflict() {
    const definers = {};
    const conflicts = {};

    // 解决冲突，例如两个不同的模块有一个同名函数，则需要对其中一个重命名
    this.statements.forEach(statement => {
      Object.keys(statement._defines).forEach(name => {
        if (Reflect.has(definers, name)) {
          conflicts[name] = true;
        } else {
          definers[name] = [];
        }

        definers[name].push(statement._module);
      });
    });

    // 将外部模块依赖更改为全限制形式
    // resolve() -> path.resolve(0)
    this.externalModules.forEach(module => {
      const name =
        module.suggestedNames['*'] ||
        module.suggestedNames.default ||
        module.id;

      if (Reflect.has(definers, name)) {
        conflicts[name] = true;
      } else {
        definers[name] = [];
      }

      definers[name].push(module);
      module.name = name;
    });

    // 更改冲突的命名, 具体操作就是在标识符前添加 `_`
    Object.keys(conflicts).forEach(name => {
      const getSafeName = name => {
        while (Reflect.has(conflicts, name)) {
          name = `_${name}`;
        }

        conflicts[name] = true;
        return name;
      };

      const modules = definers[name];
      modules.pop();
      modules.forEach(module => {
        const replacement = getSafeName(name);
        module.rename(name, replacement);
      });
    });
  }
}

module.exports = Bundle;
