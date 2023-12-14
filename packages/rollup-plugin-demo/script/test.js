import { readFile } from 'fs/promises';
import { ok } from 'assert';

import { build } from './buildWithConfig.js';
import {
  dropLoggerWhileLoad,
  dropLoggerWhileTransform,
  dropLoggerWhileTransformWithParse,
  dropLoggerWhileRenderChunk,
  dropLoggerWhileGenerateBundle,
  dropLoggerWhileWriteBundle,
} from './plugins/index.js';

const dropLoggerPlugins = [
  // Build hooks
  dropLoggerWhileLoad,
  dropLoggerWhileTransform,
  dropLoggerWhileTransformWithParse,

  // Output Generation Hooks
  dropLoggerWhileRenderChunk,
  dropLoggerWhileGenerateBundle,
  dropLoggerWhileWriteBundle,
];

const getConfig = plugin => {
  return {
    input: 'src/index.js',
    output: {
      file: 'dist/bundle.js',
      format: 'esm',
    },
    plugins: [plugin()],
  };
};

const test = async () => {
  const file = await readFile('dist/bundle.js', 'utf-8');
  ok(!file.includes('console.log'), 'Assertion failed');
  console.log('Test passed!');
};

const batchTest = async () => {
  for (let i = 0; i < dropLoggerPlugins.length; i++) {
    await build(getConfig(dropLoggerPlugins[i]));
    await test();
  }
};

batchTest();
