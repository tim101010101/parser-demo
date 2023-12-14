const cjs = (bundle, magicString, exportMode) => {
  let intro = `'use strict'\n\n`;

  const importBlock = bundle.externalModules
    .map(module => {
      let requireStatement = `var ${module.name} = require('${module.id}')`;

      if (module.needsDefault) {
        requireStatement +=
          '\n' +
          (module.needsNamed
            ? `var ${module.name}__default = `
            : `${module.name} = `) +
          `'default' in ${module.name} ? ${module.name}['default'] : ${module.name}`;
      }

      return requireStatement;
    })
    .join('\n');

  if (importBlock) {
    intro += importBlock + '\n\n';
  }

  magicString.prepend(intro);

  let exportBlock;

  // 默认导出
  if (exportMode === 'default' && bundle.entryModule.exports.default) {
    exportBlock = `module.exports = ${bundle.entryModule.getCanonicalName(
      'default'
    )}`;
  }

  // 命名导出
  else if (exportMode === 'named') {
    exportBlock = Object.keys(bundle.entryModule.exports)
      .map(key => {
        const specifier = bundle.entryModule.exports[key];
        const name = bundle.entryModule.getCanonicalName(specifier.localName);

        return `exports.${key} = ${name}`;
      })
      .join('\n');
  }

  if (exportBlock) {
    magicString.append('\n\n' + exportBlock);
  }

  return magicString;
};

module.exports = cjs;
