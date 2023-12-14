import { dropComments } from './drop-comments.js';

const preProcessers = [dropComments];

export const preProcess = source => {
  return preProcessers.reduce((res, processer) => {
    return processer(res);
  }, source);
};
