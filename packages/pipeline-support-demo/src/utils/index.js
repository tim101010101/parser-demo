export const isWs = char => /\s/.test(char);

export const isDigit = char => /^\d$/.test(char);

export const isNumber = source => /\d+/.test(source);

export const isAlpha = char => /[a-zA-Z_]/.test(char);

export const isAlphaNumeric = char => isAlpha(char) || isDigit(char);

export const panicAt = msg => {
  throw new Error(msg);
};
