import { build } from './buildWithConfig.js';

const getConfig = () => {
  return {
    input: 'src/index.js',
    output: {
      file: 'dist/bundle.js',
      format: 'esm',
    },
  };
};

const runBuild = async () => {
  await build(getConfig());
};

runBuild();
