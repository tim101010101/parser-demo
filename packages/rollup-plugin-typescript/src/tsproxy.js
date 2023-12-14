const ts = require('typescript');

let tsModule = ts;

const setTypescriptModule = override => {
  tsModule = override;
};

module.exports = {
  tsModule,
  setTypescriptModule,
};
