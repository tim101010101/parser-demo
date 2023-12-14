const { rollup, watch } = require('../src/rollup');

const path = p => `${__dirname}${p}`;

rollup(path('/smoke/index.js')).then(bundle => {
  bundle.wirte(path('/out/smoke.js'));
});

rollup(path('/tree-shaking/index.js')).then(bundle => {
  bundle.wirte(path('/out/tree-shaking.js'));
});

rollup(path('/global-vars/index.js')).then(bundle => {
  bundle.wirte(path('/out/global-vars.js'));
});

// watch(path('/watch-smoke/index.js')).then(({ watcher, wirte }) => {
//   watcher.on('change', () => {
//     wirte(path('/out/watch-smoke.js'));
//   });
// });
