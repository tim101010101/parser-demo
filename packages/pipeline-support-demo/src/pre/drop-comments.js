export const dropComments = source => {
  return source.replace(/\/\/.*/g, '');
};
