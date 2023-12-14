const { parse } = require('acorn');
const analyseAST = require('../ast/analyse');
const MagicString = require('magic-string');

class Module {
  code;
  path;
  bundle;

  ast;

  imports;
  exports;

  suggestedNames;

  constructor({ code, path, bundle }) {
    this.code = new MagicString(code, {
      filename: path,
    });

    this.path = path;
    this.bundle = bundle;
    this.suggestedNames = {};
    this.ast = parse(code, {
      ecmaVersion: 6,
      sourceType: 'module',
    });

    this.analyse();
  }

  // 分析该模块的导入导出信息
  analyse() {
    this.imports = {};
    this.exports = {};

    // 遍历 AST，记录导入导出信息
    this.ast.body.forEach(node => {
      let source;

      // 处理导入信息
      // import foo from './foo'
      // import { foo } from './foo'
      if (node.type === 'ImportDeclaration') {
        // './foo'
        source = node.source.value;
        node.specifiers.forEach(specifier => {
          // import foo from './foo'
          const isDefault = specifier.type == 'ImportDefaultSpecifier';
          // import * as foo from './foo'
          const isNamespace = specifier.type == 'ImportNamespaceSpecifier';

          // 'foo'
          const localName = specifier.local.name;
          const name = isDefault
            ? 'default'
            : isNamespace
            ? '*'
            : specifier.imported.name;

          // 记录导入信息
          this.imports[localName] = {
            source,
            name,
            localName,
          };
        });
      }

      // 处理导出信息
      else if (/^Export/.test(node.type)) {
        // export default function foo() {}
        // export default foo
        // export default 1
        if (node.type === 'ExportDefaultDeclaration') {
          const isDeclaration = /Declaration$/.test(node.declaration.type);
          this.exports.default = {
            node,
            name: 'default',
            localName: isDeclaration ? node.declaration.id.name : 'default',
            isDeclaration,
          };
        }

        // export { foo, bar }
        // export let foo = 1
        // export function foo() {}
        // export { foo } from './foo'
        else if (node.type === 'ExportNamedDeclaration') {
          source = node.source && node.source.value;

          // export { foo, bar, baz }
          if (node.specifiers.length) {
            node.specifiers.forEach(specifier => {
              const localName = specifier.local.name;
              const exportedName = specifier.exported.name;

              this.exports[exportedName] = {
                localName,
                exportedName,
              };

              // export { foo } from './foo'
              // 需要记录引入的模块信息
              if (source) {
                this.imports[localName] = {
                  source,
                  localName,
                  name: exportedName,
                };
              }
            });
          }

          // export let foo = 1
          // export function foo() {}
          else {
            const declaration = node.declaration;
            let name;

            if (declaration.type === 'VariableDeclaration') {
              // export let foo = 1
              name = declaration.declarations[0].id.name;
            } else {
              // export function foo() {}
              name = declaration.id.name;
            }

            this.exports[name] = {
              node,
              localName: name,
              expression: declaration,
            };
          }
        }
      }
    });

    // 分析 AST 节点的作用域信息
    // 会给节点附加一系列信息
    analyseAST(this.ast, this.code, this);

    this.definedNames = this.ast._scope.names.slice();
    this.definitions = {};
    this.definitionPromises = {};
    this.canonicalNames = {};
    this.modifications = {};

    // 记录当前模块下的全局变量、函数定义
    // 以及对全局变量的修改语句
    this.ast.body.forEach(statement => {
      // 记录当前语句下的变量
      Object.keys(statement._defines).forEach(name => {
        this.definitions[name] = statement;
      });

      // 记录修改语句
      Object.keys(statement._modifies).forEach(name => {
        if (!Reflect.has(this.modifications, name)) {
          this.modifications[name] = [];
        }

        this.modifications[name].push(statement);
      });
    });
  }

  expandAllStatements(isEntryModule) {
    return this.ast.body.reduce((allStatements, statement) => {
      // 跳过已经包含的语句
      if (statement._included) return allStatements;

      // 跳过导入语句实现 TreeShaking
      // 在其他类型的语句中若出现了对其他模块的依赖才会进行加载
      if (statement.type === 'ImportDeclaration') return allStatements;

      // 处理命名导出语句
      // export { foo, bar }
      if (
        statement.type === 'ExportNamedDeclaration' &&
        statement.specifiers.length
      ) {
        // 若为入口模块，则尝试加载依赖模块
        // `this.expandStatement` 会检查缓存，因此是尝试加载
        if (isEntryModule) {
          const statements = this.expandStatement(statement);
          allStatements.push(statements);
        }
      }

      // 普通语句直接展开
      else {
        const statements = this.expandStatement(statement);
        allStatements.push.apply(allStatements, statements);
      }

      return allStatements;
    }, []);
  }

  expandStatement(statement) {
    // 跳过已经加载的语句
    if (statement._included) return [];

    // 将当前语句标记为已加载
    statement._included = true;

    const result = [];

    // 加载依赖模块中所有语句
    Object.keys(statement._dependsOn).forEach(dependence => {
      const definition = this.define(dependence);
      result.push.apply(result, definition);
    });
    // 加载当前语句
    result.push(statement);

    Object.keys(statement._defines).forEach(name => {
      const modifications =
        Reflect.has(this.modifications, name) && this.modifications[name];

      if (modifications) {
        modifications.forEach(() => {
          if (!statement._included) {
            const statements = this.expandStatement(statement);
            result.push(statements);
          }
        });
      }
    });

    return result;
  }

  define(name) {
    // 若已经定义，则返回
    if (Reflect.has(this.definitionPromises, name)) {
      return [];
    }

    // 定义语句在其他模块
    if (Reflect.has(this.imports, name)) {
      const importDeclaration = this.imports[name];
      const module = this.bundle.fetchModule(
        importDeclaration.source,
        this.path
      );

      importDeclaration.module = module;

      // 默认导入
      if (importDeclaration.name === 'default') {
        const localName = importDeclaration.localName;
        const suggestion = Reflect.has(this.suggestedNames, localName)
          ? this.suggestedNames[localName]
          : localName;
        module.suggestName('default', suggestion);
      }

      // 命名空间导入
      else if (importDeclaration.name === '*') {
        const localName = importDeclaration.localName;
        const suggestion = Reflect.has(this.suggestedNames, localName)
          ? this.suggestedNames[localName]
          : localName;

        module.suggestName('*', suggestion);
        module.suggestName('default', `${suggestion}__default`);
      }

      // 是外部模块
      if (module.isExternal) {
        if (importDeclaration.name === 'default') {
          module.needsDefault = true;
        } else {
          module.needsNamed = true;
        }

        module.importedByBundle.push(importDeclaration);
        return [];
      }

      if (importDeclaration.name === '*') {
        // 需要注册
        if (!this.bundle.internalNamespaceModules.includes(module)) {
          this.bundle.internalNamespaceModules.push(module);
        }

        return module.expandAllStatements();
      }

      const exportDeclaration = module.exports[importDeclaration.name];
      if (!exportDeclaration) {
        throw new Error(
          `Module ${module.path} does not export ${importDeclaration.name} (imported by ${this.path})`
        );
      }

      // 注册记录当前的处理结果
      this.definitionPromises[name] = module.define(
        exportDeclaration.localName
      );
    }

    // 定义语句在当前模块
    else if (name === 'default' && this.exports.default.isDeclaration) {
      // 注册记录当前的处理结果
      this.definitionPromises[name] = this.define(this.exports.default.name);
    }

    // 其他情况
    else {
      let statement;

      if (name === 'default') {
        statement = this.exports.default.node;
      } else {
        statement = this.definitions[name];
      }

      if (statement && !statement._included) {
        // 注册记录当前的处理结果
        this.definitionPromises[name] = this.expandStatement(statement);
      }
    }

    return this.definitionPromises[name];
  }

  getCanonicalName(localName) {
    if (Reflect.has(this.suggestedNames, localName)) {
      localName = this.suggestedNames[localName];
    }

    if (!Reflect.has(this.canonicalNames, localName)) {
      let canonicalName;

      if (Reflect.has(this.imports, localName)) {
        const importDeclaration = this.imports[localName];
        const module = importDeclaration.module;

        if (importDeclaration.name === '*') {
          canonicalName = module.suggestedNames['*'];
        } else {
          let exporterLocalName;

          if (module.isExternal) {
            exporterLocalName = importDeclaration.name;
          } else {
            const exportDeclaration = module.exports[importDeclaration.name];
            exporterLocalName = exportDeclaration.localName;
          }

          canonicalName = module.getCanonicalName(exporterLocalName);
        }
      } else {
        canonicalName = localName;
      }

      this.canonicalNames[localName] = canonicalName;
    }

    return this.canonicalNames[localName];
  }

  rename(name, replacement) {
    this.canonicalNames[name] = replacement;
  }

  suggestName(exportName, suggestion) {
    if (!this.suggestedNames[exportName]) {
      this.suggestedNames[exportName] = suggestion;
    }
  }
}

module.exports = Module;
