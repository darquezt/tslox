import LoxClass from './LoxClass';
import Value from '../syntax/ast/Value';
import Token from '../syntax/Token';
import { RuntimeError } from '../helpers/errors';

export default class LoxInstance {
  private fields: Record<string, Value> = {};

  constructor(private klass: LoxClass) {}

  get(name: Token): Value {
    const value = this.fields[name.lexeme];

    if (value !== undefined) {
      return value;
    }

    const method = this.klass.findMethod(name.lexeme);

    if (method) {
      return method.bindInstance(this);
    }

    throw new RuntimeError(name, `Undefined property ${name.lexeme}.`);
  }

  set(name: Token, value: Value): void {
    this.fields[name.lexeme] = value;
  }

  toString(): string {
    return `${this.klass} instance`;
  }
}
