import Value from '../syntax/ast/Value';
import Token from '../syntax/Token';

import { RuntimeError } from '../helpers/errors';

export default class Environment {
  private values: Record<string, Value> = {};

  constructor(public enclosing?: Environment) {}

  define(name: string, value: Value): void {
    this.values[name] = value;
  }

  get(name: Token): Value {
    const value = this.values[name.lexeme];

    if (value !== undefined) {
      return value;
    }

    if (this.enclosing) {
      return this.enclosing.get(name);
    }

    throw new RuntimeError(name, `Undefined variable ${name.lexeme}.`);
  }

  private getByString(name: string): Value {
    return this.values[name];
  }

  getAt(distance: number, name: string): Value {
    return this.ancestor(distance).getByString(name);
  }

  private ancestor(distance: number): Environment {
    if (distance === 0) {
      return this;
    }

    return this.enclosing.ancestor(distance - 1);
  }

  assign(name: Token, value: Value): void {
    if (this.values[name.lexeme] !== undefined) {
      this.values[name.lexeme] = value;
      return;
    }

    if (this.enclosing) {
      return this.enclosing.assign(name, value);
    }

    throw new RuntimeError(name, `Cannot assign value to undefined variable ${name.lexeme}.`);
  }

  assignAt(distance: number, name: Token, value: Value): void {
    this.ancestor(distance).assign(name, value);
  }
}
