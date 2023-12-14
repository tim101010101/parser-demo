import { polyfillPipeline } from './polyfill-pipeline-op.js';
import { foldConstant } from './fold-constant.js';

const transformers = [polyfillPipeline, foldConstant];

export const transform = ast => {
  return transformers.reduce((res, transform) => {
    return transform(res);
  }, ast);
};
