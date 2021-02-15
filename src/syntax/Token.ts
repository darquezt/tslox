import Value from './ast/Value';
import TokenType from './TokenType';

export default class Token {
  constructor(
    public type: TokenType,
    public lexeme: string,
    public literal: Value,
    public line: number,
  ) {}

  toString(): string {
    return `code = ${this.type}, lexeme = '${this.lexeme}', value = ${this.literal}`;
  }
}
