export const toISOStringDate = (startIndex: number, endIndex: number) => (date: Date) => {
  if (typeof startIndex === 'number' && typeof endIndex === 'number') {
    return date.toISOString().slice(startIndex, endIndex);
  }

  return date.toISOString();
};
