const Bundle = require('./bundle');
const fs = require('fs');

const rollup = async (entry, options = {}) => {
  const bundle = new Bundle({ entry, ...options });
  bundle.build();

  return {
    wirte(dest, options = {}) {
      const { code } = bundle.generate({
        dest,
        format: options.format,
      });

      return fs.writeFile(dest, code, err => {
        if (err) throw err;
      });
    },
  };
};

const watch = async (entry, options = {}) => {
  const bundle = new Bundle({ entry, ...options });
  const watcher = bundle.watch();

  watcher.on('change', (_, filename) => {
    console.log(`${filename} changed, rebuilding...`);
    bundle.reset();
    bundle.build();
    console.log('Done');
  });

  return {
    watcher,
    wirte(dest, options = {}) {
      const { code } = bundle.generate({
        dest,
        format: options.format,
      });

      return fs.writeFile(dest, code, err => {
        if (err) throw err;
      });
    },
  };
};

module.exports = { rollup, watch };
