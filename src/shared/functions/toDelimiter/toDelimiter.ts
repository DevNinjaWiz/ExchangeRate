/**
 * Base function for delimiter-based currying helpers.
 * Combines two keys with a delimiter.
 */
export const toDelimiter = (delimiter: string) => (value1: string, value2: string) =>
  `${value1}${delimiter}${value2}`;
