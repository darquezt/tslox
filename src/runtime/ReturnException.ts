import Value from '../syntax/ast/Value';

/**
 * This was originally named `Return`
 */
export default class ReturnException {
  constructor(public value: Value) {}
}
