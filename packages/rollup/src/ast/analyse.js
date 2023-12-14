const walk = require('./walk');
const Scope = require('./scope');

// 分析语句作用域，并处理依赖关系
const analyseAST = (ast, magicString, module) => {
  let scope = new Scope();
  let currentTopLevelStatement;

  const addToScope = declarator => {
    const name = declarator.id.name;
    scope.add(name, false);

    if (!scope.parent) {
      currentTopLevelStatement._defines[name] = true;
    }
  };

  const addToBlockScope = declarator => {
    const name = declarator.id.name;
    scope.add(name, true);

    if (!scope.parent) {
      currentTopLevelStatement._defines[name] = true;
    }
  };

  let previousStatement = null;

  // 定义作用域
  ast.body.forEach(statement => {
    currentTopLevelStatement = statement;

    [
      ['_defines', {}],
      ['_modifies', {}],
      ['_dependsOn', {}],
      ['_included', false],
      ['_module', module],
      ['_source', magicString.snip(statement.start, statement.end)],
      ['_margin', [0, 0]],
    ].forEach(([key, value]) => {
      Reflect.set(statement, key, value, statement);
    });

    const previousEnd = previousStatement ? previousStatement.end : 0;
    const start = statement.start;

    const gap = magicString.original.slice(previousEnd, start);
    const margin = gap.split('\n').length;

    if (previousStatement) previousStatement._margin[1] = margin;
    statement._margin[0] = margin;

    walk(statement, {
      enter(node) {
        let newScope;

        switch (node.type) {
          case 'FunctionExpression':
          case 'FunctionDeclaration':
          case 'ArrowFunctionExpression':
            const names = node.params.map(({ name }) => name);

            if (node.type === 'FunctionDeclaration') {
              addToScope(node);
            } else if (node.type === 'FunctionExpression' && node.id) {
              names.push(node.id.name);
            }

            newScope = new Scope({
              parent: scope,
              params: names,
              block: false,
            });

            break;

          case 'BlockStatement':
            newScope = new Scope({
              parent: scope,
              block: true,
            });

            break;

          case 'CatchClause':
            newScope = new Scope({
              parent: scope,
              params: [node.param.name],
              block: true,
            });

            break;

          case 'VariableDeclaration':
            node.declarations.forEach(
              node.kind === 'let' ? addToBlockScope : addToScope
            );
            break;

          case 'ClassDeclaration':
            addToScope(node);
            break;
        }

        if (newScope) {
          Object.defineProperty(node, '_scope', { value: newScope });
          scope = newScope;
        }
      },

      leave(node) {
        if (node === currentTopLevelStatement) {
          currentTopLevelStatement = null;
        }

        if (node._scope) {
          scope = scope.parent;
        }
      },
    });

    previousStatement = statement;
  });

  // 找出顶级依赖，以及可能修改的依赖
  ast.body.forEach(statement => {
    // 是否读取依赖
    const checkForReads = (node, parent) => {
      // 节点类型为 Identifier，并且不存在 statement 作用域中，说明它是顶级依赖项
      if (node.type === 'Identifier') {
        // disregard the `bar` in `foo.bar` - these appear as Identifier nodes
        //
        if (parent.type === 'MemberExpression' && node !== parent.object) {
          return;
        }

        // disregard the `bar` in { bar: foo }
        if (parent.type === 'Property' && node !== parent.value) {
          return;
        }

        const definingScope = scope.findDefiningScope(node.name);

        if (
          (!definingScope || definingScope.depth === 0) &&
          !statement._defines[node.name]
        ) {
          statement._dependsOn[node.name] = true;
        }
      }
    };

    // 是否修改依赖
    const checkForWrites = node => {
      const addNode = node => {
        while (node.type === 'MemberExpression') {
          node = node.object;
        }

        if (node.type !== 'Identifier') return;

        statement._modifies[node.name] = true;
      };

      // foo = 1
      if (node.type === 'AssignmentExpression') {
        addNode(node.left);
      }

      // i++ / i--
      else if (node.type === 'UpdateExpression') {
        addNode(node.argument);
      }

      // foo()
      else if (node.type === 'CallExpression') {
        node.arguments.forEach(arg => addNode(arg));
      }
    };

    walk(statement, {
      enter(node, parent, { skip }) {
        // 跳过导入语句
        if (/^Import/.test(node.type)) return skip();

        if (node._scope) scope = node._scope;

        checkForReads(node, parent);
        checkForWrites(node, parent);
      },

      leave(node) {
        if (node._scope) scope = scope.parent;
      },
    });
  });

  ast._scope = scope;
};

module.exports = analyseAST;
