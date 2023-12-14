let shouldSkip = false;
let shouldAbort = false;
const context = {
  skip: () => (shouldSkip = true),
  abort: () => (shouldAbort = true),
};

const childKeys = {};

// 对 AST 节点调用 enter() 和 leave() 函数，如果有子节点将递归调用
const walk = (ast, { enter, leave }) => {
  shouldAbort = false;
  visit(ast, null, enter, leave);
};

const visit = (node, parent, enter, leave) => {
  if (!node || shouldAbort) return;

  if (enter) {
    shouldSkip = false;
    enter(node, parent, context);
    if (shouldSkip || shouldAbort) return;
  }

  const keys =
    childKeys[node.type] ||
    (childKeys[node.type] = Object.keys(node).filter(
      key => typeof node[key] === 'object'
    ));

  let key, value, i, j;

  i = keys.length;
  while (i--) {
    key = keys[i];
    value = node[key];

    if (Array.isArray(value)) {
      j = value.length;
      while (j--) {
        visit(value[j], node, enter, leave);
      }
    } else if (value && value.type) {
      visit(value, node, enter, leave);
    }
  }

  if (leave && !shouldAbort) {
    leave(node, parent);
  }
};

module.exports = walk;
