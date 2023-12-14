const walk = require('../ast/walk');

// 重写名称
const replaceIdentifiers = (statement, snippet, names) => {
  const replacementStack = [names];
  const keys = Object.keys(names);

  if (keys.length === 0) return;

  walk(statement, {
    enter(node, parent, { skip }) {
      const scope = node._scope;

      if (scope) {
        const newNames = {};
        let hasReplacements = false;

        keys.forEach(key => {
          if (!scope.names.includes(key)) {
            newNames[key] = names[key];
            hasReplacements = true;
          }
        });

        if (!hasReplacements) {
          return skip();
        }

        names = newNames;
        replacementStack.push(newNames);
      }

      // 只处理标识符，不处理属性名
      if (node.type !== 'Identifier') return;
      if (parent.type === 'MemberExpression' && node !== parent.object) return;
      if (parent.type === 'Property' && node !== parent.value) return;

      const name = Reflect.has(names, node.name) && names[node.name];
      if (name && name !== node.name) {
        snippet.overwrite(node.start, node.end, name);
      }
    },

    leave(node) {
      if (node._scope) {
        replacementStack.pop();
        names = replacementStack[replacementStack.length - 1];
      }
    },
  });
};

module.exports = replaceIdentifiers;
