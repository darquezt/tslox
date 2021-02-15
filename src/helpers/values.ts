import Value from '../syntax/ast/Value';

export const formatValue = (value: Value): string => {
  if (value === null) {
    return 'nil';
  }

  return String(value);
};

export const printValue = (value: Value): void => {
  console.log(formatValue(value));
};
